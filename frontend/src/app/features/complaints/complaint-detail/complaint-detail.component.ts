import { Component, OnInit, OnDestroy } from "@angular/core";
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
} from "../../../core/models/complaint.model";

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

  printCase(): void {
    window.print();
  }

  getWorkerFirstName(fullName: string): string {
    const parts = this.getNameParts(fullName);
    return parts.firstName || this.unavailableFieldText;
  }

  getWorkerLastName(fullName: string): string {
    const parts = this.getNameParts(fullName);
    return parts.lastName || this.unavailableFieldText;
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
