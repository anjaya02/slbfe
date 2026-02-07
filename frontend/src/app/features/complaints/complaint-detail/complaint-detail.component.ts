import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
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

@Component({
  selector: "app-complaint-detail",
  templateUrl: "./complaint-detail.component.html",
  styleUrls: ["./complaint-detail.component.scss"],
})
export class ComplaintDetailComponent implements OnInit, OnDestroy {
  complaint: Complaint | null = null;
  loading = true;
  typeLabels = COMPLAINT_TYPE_LABELS;
  private destroy$ = new Subject<void>();

  // Update panel
  showUpdatePanel = false;
  selectedAction = "";
  selectedOfficerId = "";
  caseOfficers: User[] = [];
  noteText = "";
  addingNote = false;
  updating = false;

  actionOptions = [
    { value: "escalate", label: "Escalate case" },
    { value: "request_info", label: "Request Info" },
    { value: "assign", label: "Assign to Officer" },
    { value: "resolve", label: "Mark Resolved" },
    { value: "close", label: "Close Case" },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private complaintService: ComplaintService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      this.complaintService
        .getComplaintById(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (c) => {
            this.complaint = c || null;
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

    // Pre-load officers for assignment dropdown
    this.authService
      .getCaseOfficers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((officers) => (this.caseOfficers = officers));
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

    // If assigning, use the dedicated assign method
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
          officer.name,
          this.noteText,
        )
        .subscribe({
          next: (updated) => {
            this.complaint = updated;
            this.updating = false;
            this.showUpdatePanel = false;
            this.selectedAction = "";
            this.selectedOfficerId = "";
            this.snackBar.open(`Assigned to ${officer.name}`, "Close", {
              duration: 3000,
              panelClass: ["success-snackbar"],
            });
          },
          error: () => {
            this.updating = false;
            this.snackBar.open("Failed to assign complaint", "Close", {
              duration: 3000,
              panelClass: ["error-snackbar"],
            });
          },
        });
      return;
    }

    this.updating = true;
    const statusMap: Record<string, ComplaintStatus> = {
      escalate: ComplaintStatus.ESCALATED,
      resolve: ComplaintStatus.RESOLVED,
      close: ComplaintStatus.CLOSED,
      request_info: ComplaintStatus.AWAITING_INFO,
    };
    const newStatus = statusMap[this.selectedAction] || this.complaint.status;
    this.complaintService
      .updateComplaintStatus(this.complaint.id, newStatus, this.noteText)
      .subscribe({
        next: (updated) => {
          this.complaint = updated;
          this.updating = false;
          this.showUpdatePanel = false;
          this.selectedAction = "";
          this.snackBar.open("Status updated successfully", "Close", {
            duration: 3000,
            panelClass: ["success-snackbar"],
          });
        },
        error: () => {
          this.updating = false;
          this.snackBar.open("Failed to update status", "Close", {
            duration: 3000,
            panelClass: ["error-snackbar"],
          });
        },
      });
  }

  get isAssignDisabled(): boolean {
    if (this.selectedAction === "assign") {
      return this.updating || !this.selectedOfficerId;
    }
    return this.updating || !this.selectedAction;
  }

  addNote(): void {
    if (!this.complaint || !this.noteText.trim()) return;
    this.addingNote = true;
    this.complaintService
      .addNote(this.complaint.id, this.noteText, true)
      .subscribe({
        next: (note) => {
          this.complaint = {
            ...this.complaint!,
            notes: [...this.complaint!.notes, note],
          };
          this.noteText = "";
          this.addingNote = false;
          this.snackBar.open("Note added successfully", "Close", {
            duration: 3000,
            panelClass: ["success-snackbar"],
          });
        },
        error: () => {
          this.addingNote = false;
        },
      });
  }

  printCase(): void {
    window.print();
  }
}
