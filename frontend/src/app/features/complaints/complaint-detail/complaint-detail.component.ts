import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastService } from "../../../core/services/toast.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ComplaintService } from "../../../core/services/complaint.service";
import { AuthService } from "../../../core/services/auth.service";
import { User } from "../../../core/models/user.model";
import {
  Complaint,
  ComplaintStatus,
  COMPLAINT_TYPE_LABELS,
} from "../../../core/models/complaint.model";

type PdfDocument = InstanceType<typeof import("jspdf")["default"]>;
type PdfColor = [number, number, number];

interface PdfLayout {
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;
}

@Component({
  standalone: false,
  selector: "app-complaint-detail",
  templateUrl: "./complaint-detail.component.html",
  styleUrls: ["./complaint-detail.component.scss"],
})
export class ComplaintDetailComponent implements OnInit, OnDestroy {
  complaint: Complaint | null = null;
  loading = true;
  readonly unavailableFieldText = "Not provided";
  isSupervisor = false;
  private destroy$ = new Subject<void>();
  showUpdatePanel = false;
  selectedAction = "";
  selectedOfficerId = "";
  caseOfficers: User[] = [];
  actionNote = "";
  internalNoteText = "";
  addingNote = false;
  updating = false;
  exportingPdf = false;

  actionOptions: { value: string; label: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private complaintService: ComplaintService,
    private authService: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.isSupervisor = this.authService.currentUser?.role === "SUPERVISOR";
    this.actionOptions = this.isSupervisor
      ? [
          { value: "request_info", label: "Request Info" },
          { value: "assign", label: "Assign to Officer" },
          { value: "resolve", label: "Mark Resolved" },
          { value: "close", label: "Close Case" },
        ]
      : [
          { value: "request_info", label: "Request Info" },
          { value: "resolve", label: "Mark Resolved" },
          { value: "close", label: "Close Case" },
        ];

    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      this.complaintService
        .getComplaintById(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (c) => {
            this.complaint = c ? this.normalizeComplaintTimeline(c) : null;
            this.loading = false;
          },
          error: () => {
            this.complaint = null;
            this.loading = false;
          },
        });
    } else {
      this.loading = false;
    }

    if (this.isSupervisor) {
      this.authService
        .getCaseOfficers()
        .pipe(takeUntil(this.destroy$))
        .subscribe((officers) => (this.caseOfficers = officers));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleUpdatePanel(): void {
    this.showUpdatePanel = !this.showUpdatePanel;
    this.selectedAction = "";
    this.selectedOfficerId = "";
  }

  updateStatus(): void {
    if (!this.complaint || !this.selectedAction) return;

    if (this.selectedAction === "assign") {
      if (!this.selectedOfficerId) return;
      const officer = this.caseOfficers.find(
        (o) => o.id === this.selectedOfficerId,
      );
      if (!officer) return;
      this.updating = true;
      this.complaintService
        .assignComplaint(
          this.complaint.id,
          officer.id,
          this.actionNote,
        )
        .subscribe({
          next: (updated) => {
            this.complaint = this.normalizeComplaintTimeline(updated);
            this.updating = false;
            this.showUpdatePanel = false;
            this.selectedAction = "";
            this.selectedOfficerId = "";
            this.actionNote = "";
            this.internalNoteText = "";
            this.toast.success(`Assigned to ${officer.name}`);
          },
          error: () => {
            this.updating = false;
          },
        });
      return;
    }

    this.updating = true;
    const statusMap: Record<string, ComplaintStatus> = {
      resolve: ComplaintStatus.RESOLVED,
      close: ComplaintStatus.CLOSED,
      request_info: ComplaintStatus.AWAITING_INFO,
    };
    const newStatus = statusMap[this.selectedAction] || this.complaint.status;
    this.complaintService
      .updateComplaintStatus(this.complaint.id, newStatus, this.actionNote)
      .subscribe({
        next: (updated) => {
          this.complaint = this.normalizeComplaintTimeline(updated);
          this.updating = false;
          this.showUpdatePanel = false;
          this.selectedAction = "";
          this.selectedOfficerId = "";
          this.actionNote = "";
          this.internalNoteText = "";
          this.toast.success("Status updated successfully");
        },
        error: () => {
          this.updating = false;
        },
      });
  }

  get isAssignDisabled(): boolean {
    if (this.selectedAction === "assign") {
      return this.updating || !this.selectedOfficerId;
    }
    return this.updating || !this.selectedAction;
  }

  get canAssignComplaint(): boolean {
    return this.isSupervisor;
  }

  addNote(): void {
    if (!this.complaint || !this.internalNoteText.trim()) return;
    this.addingNote = true;
    this.complaintService
      .addNote(this.complaint.id, this.internalNoteText, true)
      .subscribe({
        next: (note) => {
          this.complaint = this.normalizeComplaintTimeline({
            ...this.complaint!,
            notes: [...this.complaint!.notes, note],
          });
          this.internalNoteText = "";
          this.addingNote = false;
          this.toast.success("Note added successfully");
        },
        error: () => {
          this.addingNote = false;
        },
      });
  }

  async downloadPDF(): Promise<void> {
    if (!this.complaint || this.exportingPdf) {
      return;
    }

    this.exportingPdf = true;

    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const emblemDataUrl = await this.loadAssetAsDataUrl(
        "assets/Emblem_of_Sri_Lanka.png",
      );

      this.buildComplaintPdf(pdf, this.complaint, emblemDataUrl);
      pdf.save(`complaint-${this.complaint.id}.pdf`);
      this.toast.success("Complaint downloaded successfully");
    } catch {
      this.toast.error("Failed to download PDF");
    } finally {
      this.exportingPdf = false;
    }
  }

  private buildComplaintPdf(
    pdf: PdfDocument,
    complaint: Complaint,
    emblemDataUrl: string | null,
  ): void {
    const layout: PdfLayout = {
      margin: 14,
      pageWidth: pdf.internal.pageSize.getWidth(),
      pageHeight: pdf.internal.pageSize.getHeight(),
      contentWidth: pdf.internal.pageSize.getWidth() - 28,
      y: 0,
    };

    this.drawReportCoverHeader(pdf, layout, complaint, emblemDataUrl);
    layout.y = 52;

    this.drawSummaryCards(pdf, layout, complaint);
    this.drawSectionTitle(pdf, layout, "Worker Profile");
    this.drawFieldGrid(pdf, layout, [
      ["Full Name", complaint.workerName],
      ["NIC", complaint.workerNIC],
      ["Passport", complaint.workerPassport || this.unavailableFieldText],
      ["Mobile Number", complaint.workerContact],
      ["Address", complaint.workerAddress || this.unavailableFieldText],
      ["Registration Path", this.getRegistrationPathLabel(complaint.registrationPath)],
    ]);

    this.drawSectionTitle(pdf, layout, "Complaint Details");
    this.drawFieldGrid(pdf, layout, [
      ["Reference Number", complaint.referenceNo],
      ["Complaint Type", COMPLAINT_TYPE_LABELS[complaint.type]],
      ["Service ID", complaint.serviceId],
      ["Branch", complaint.branch],
      ["Submitted On", this.formatDateTime(complaint.dateSubmitted)],
      ["Last Updated", this.formatDateTime(complaint.dateUpdated)],
    ]);
    this.drawTextBox(pdf, layout, "Incident Description", complaint.description);

    this.drawSectionTitle(pdf, layout, "Case Management History");
    if (complaint.history.length) {
      complaint.history.forEach((historyItem, index) => {
        this.drawTimelineItem(
          pdf,
          layout,
          historyItem.action,
          historyItem.description,
          historyItem.performedBy,
          historyItem.timestamp,
          index < complaint.history.length - 1,
        );
      });
    } else {
      this.drawEmptyState(pdf, layout, "No case history is available.");
    }

    this.drawSectionTitle(pdf, layout, "Worker / Complaint Notes");
    if (complaint.notes.length) {
      complaint.notes.forEach((note) => {
        this.drawNoteCard(
          pdf,
          layout,
          this.getNoteTypeLabel(note.type),
          note.content,
          note.author,
          note.timestamp,
        );
      });
    } else {
      this.drawEmptyState(pdf, layout, "No notes have been added.");
    }

    this.drawPdfFooters(pdf);
  }

  private drawReportCoverHeader(
    pdf: PdfDocument,
    layout: PdfLayout,
    complaint: Complaint,
    emblemDataUrl: string | null,
  ): void {
    const primary: PdfColor = [0, 68, 128];
    const accent: PdfColor = [76, 130, 214];

    pdf.setFillColor(...primary);
    pdf.rect(0, 0, layout.pageWidth, 38, "F");
    pdf.setFillColor(...accent);
    pdf.rect(0, 38, layout.pageWidth, 3, "F");

    if (emblemDataUrl) {
      pdf.addImage(emblemDataUrl, "PNG", layout.margin, 9, 12, 16);
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(
      "Ministry of Foreign Affairs, Foreign Employment & Tourism",
      layout.margin + 18,
      15,
    );
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Consular Affairs Division", layout.margin + 18, 21);
    pdf.text("Complaint Case Report", layout.margin + 18, 31);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(complaint.id, layout.pageWidth - layout.margin, 18, {
      align: "right",
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(
      `Generated ${this.formatDateTime(new Date())}`,
      layout.pageWidth - layout.margin,
      25,
      { align: "right" },
    );
  }

  private drawCompactPageHeader(pdf: PdfDocument, layout: PdfLayout): void {
    pdf.setFillColor(0, 68, 128);
    pdf.rect(0, 0, layout.pageWidth, 13, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Complaint Case Report", layout.margin, 8.5);
  }

  private drawSummaryCards(
    pdf: PdfDocument,
    layout: PdfLayout,
    complaint: Complaint,
  ): void {
    const gap = 4;
    const cardWidth = (layout.contentWidth - gap * 3) / 4;
    const cards: Array<[string, string, PdfColor]> = [
      ["Status", complaint.status, [0, 68, 128]],
      ["Priority", complaint.priority, [220, 38, 38]],
      [
        "Assigned Officer",
        complaint.assignedToName || "Unassigned",
        [37, 99, 235],
      ],
      ["Reference", complaint.referenceNo, [5, 150, 105]],
    ];

    cards.forEach(([label, value, color], index) => {
      const x = layout.margin + index * (cardWidth + gap);
      pdf.setDrawColor(224, 231, 255);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, layout.y, cardWidth, 24, 3, 3, "FD");
      pdf.setFillColor(...color);
      pdf.roundedRect(x, layout.y, 2.5, 24, 1.5, 1.5, "F");
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(label.toUpperCase(), x + 6, layout.y + 8);
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(10);
      pdf.text(this.truncateText(pdf, value, cardWidth - 12), x + 6, layout.y + 16);
    });

    layout.y += 34;
  }

  private drawSectionTitle(
    pdf: PdfDocument,
    layout: PdfLayout,
    title: string,
  ): void {
    this.ensurePdfSpace(pdf, layout, 16);
    pdf.setTextColor(0, 68, 128);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(title, layout.margin, layout.y);
    pdf.setDrawColor(191, 219, 254);
    pdf.line(layout.margin, layout.y + 3, layout.pageWidth - layout.margin, layout.y + 3);
    layout.y += 10;
  }

  private drawFieldGrid(
    pdf: PdfDocument,
    layout: PdfLayout,
    fields: Array<[string, string]>,
  ): void {
    const gap = 5;
    const cellWidth = (layout.contentWidth - gap) / 2;

    for (let index = 0; index < fields.length; index += 2) {
      const left = fields[index];
      const right = fields[index + 1];
      const leftHeight = this.getFieldCellHeight(pdf, left[1], cellWidth);
      const rightHeight = right
        ? this.getFieldCellHeight(pdf, right[1], cellWidth)
        : leftHeight;
      const rowHeight = Math.max(leftHeight, rightHeight);

      this.ensurePdfSpace(pdf, layout, rowHeight + 4);
      this.drawFieldCell(pdf, layout.margin, layout.y, cellWidth, rowHeight, left);

      if (right) {
        this.drawFieldCell(
          pdf,
          layout.margin + cellWidth + gap,
          layout.y,
          cellWidth,
          rowHeight,
          right,
        );
      }

      layout.y += rowHeight + 4;
    }
  }

  private getFieldCellHeight(
    pdf: PdfDocument,
    value: string,
    width: number,
  ): number {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(value || this.unavailableFieldText, width - 10);
    return Math.max(18, 12 + lines.length * 4.5);
  }

  private drawFieldCell(
    pdf: PdfDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    field: [string, string],
  ): void {
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, width, height, 3, 3, "FD");
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(field[0].toUpperCase(), x + 5, y + 7);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(
      field[1] || this.unavailableFieldText,
      width - 10,
    );
    pdf.text(lines, x + 5, y + 13);
  }

  private drawTextBox(
    pdf: PdfDocument,
    layout: PdfLayout,
    title: string,
    text: string,
  ): void {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(text || this.unavailableFieldText, layout.contentWidth - 12);
    const height = 18 + lines.length * 4.8;

    this.ensurePdfSpace(pdf, layout, height + 4);
    pdf.setDrawColor(191, 219, 254);
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(layout.margin, layout.y, layout.contentWidth, height, 3, 3, "FD");
    pdf.setTextColor(0, 68, 128);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(title.toUpperCase(), layout.margin + 6, layout.y + 8);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(lines, layout.margin + 6, layout.y + 15);
    layout.y += height + 6;
  }

  private drawTimelineItem(
    pdf: PdfDocument,
    layout: PdfLayout,
    action: string,
    description: string,
    performedBy: string,
    timestamp: Date,
    hasNext: boolean,
  ): void {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(description, layout.contentWidth - 28);
    const itemHeight = Math.max(24, 18 + lines.length * 4.8);

    this.ensurePdfSpace(pdf, layout, itemHeight + 3);
    const dotX = layout.margin + 4;
    const dotY = layout.y + 6;

    if (hasNext) {
      pdf.setDrawColor(203, 213, 225);
      pdf.line(dotX, dotY + 3, dotX, layout.y + itemHeight + 2);
    }

    pdf.setFillColor(5, 150, 105);
    pdf.circle(dotX, dotY, 2.4, "F");
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(action, layout.margin + 13, layout.y + 6);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(
      `${this.formatDateTime(timestamp)} | ${performedBy}`,
      layout.margin + 13,
      layout.y + 11,
    );
    pdf.setTextColor(51, 65, 85);
    pdf.setFontSize(8.5);
    pdf.text(lines, layout.margin + 13, layout.y + 17);
    layout.y += itemHeight + 3;
  }

  private drawNoteCard(
    pdf: PdfDocument,
    layout: PdfLayout,
    type: string,
    content: string,
    author: string,
    timestamp: Date,
  ): void {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    const lines = pdf.splitTextToSize(content, layout.contentWidth - 18);
    const height = Math.max(25, 20 + lines.length * 4.6);

    this.ensurePdfSpace(pdf, layout, height + 5);
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(layout.margin, layout.y, layout.contentWidth, height, 3, 3, "FD");
    pdf.setFillColor(219, 234, 254);
    pdf.roundedRect(layout.margin + 5, layout.y + 5, 26, 6, 2, 2, "F");
    pdf.setTextColor(30, 64, 175);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.text(type.toUpperCase(), layout.margin + 8, layout.y + 9.2);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(this.formatDateTime(timestamp), layout.margin + 36, layout.y + 9);
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(8.5);
    pdf.text(lines, layout.margin + 7, layout.y + 17);
    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text(`By ${author}`, layout.margin + 7, layout.y + height - 5);
    layout.y += height + 5;
  }

  private drawEmptyState(
    pdf: PdfDocument,
    layout: PdfLayout,
    message: string,
  ): void {
    this.ensurePdfSpace(pdf, layout, 16);
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(layout.margin, layout.y, layout.contentWidth, 14, 3, 3, "FD");
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(message, layout.margin + 6, layout.y + 9);
    layout.y += 20;
  }

  private ensurePdfSpace(
    pdf: PdfDocument,
    layout: PdfLayout,
    neededHeight: number,
  ): void {
    if (layout.y + neededHeight <= layout.pageHeight - 18) {
      return;
    }

    pdf.addPage();
    this.drawCompactPageHeader(pdf, layout);
    layout.y = 24;
  }

  private drawPdfFooters(pdf: PdfDocument): void {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text("SLBFE - Consular Affairs Division", 14, pageHeight - 8);
      pdf.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
        align: "right",
      });
    }
  }

  private truncateText(pdf: PdfDocument, text: string, maxWidth: number): string {
    if (pdf.getTextWidth(text) <= maxWidth) {
      return text;
    }

    let shortened = text;
    while (shortened.length > 3 && pdf.getTextWidth(`${shortened}...`) > maxWidth) {
      shortened = shortened.slice(0, -1);
    }

    return `${shortened}...`;
  }

  private async loadAssetAsDataUrl(assetPath: string): Promise<string | null> {
    try {
      const response = await fetch(assetPath);
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat("en-LK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  private getNoteTypeLabel(type: string): string {
    if (type === "WORKER_UPDATE") {
      return "Worker";
    }

    if (type === "INTERNAL_NOTE") {
      return "Internal";
    }

    return "System";
  }

  getWorkerFirstName(fullName: string): string {
    const parts = this.getNameParts(fullName);
    return parts.firstName || this.unavailableFieldText;
  }

  getWorkerLastName(fullName: string): string {
    const parts = this.getNameParts(fullName);
    return parts.lastName || this.unavailableFieldText;
  }

  getRegistrationPathLabel(path: Complaint["registrationPath"]): string {
    return path === "SLBFE" ? "SLBFE Transfer" : "Consular Path";
  }

  private getNameParts(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    if (!normalizedName) {
      return { firstName: "", lastName: "" };
    }

    const parts = normalizedName.split(" ");
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "" };
    }

    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }

  private normalizeComplaintTimeline(complaint: Complaint): Complaint {
    return {
      ...complaint,
      history: [...complaint.history].sort(
        (left, right) => right.timestamp.getTime() - left.timestamp.getTime(),
      ),
      notes: [...complaint.notes].sort(
        (left, right) => right.timestamp.getTime() - left.timestamp.getTime(),
      ),
    };
  }
}
