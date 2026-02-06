import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ComplaintService } from "../../../core/services/complaint.service";
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
export class ComplaintDetailComponent implements OnInit {
  complaint: Complaint | null = null;
  loading = true;
  typeLabels = COMPLAINT_TYPE_LABELS;

  // Update panel
  showUpdatePanel = false;
  selectedAction = "";
  noteText = "";
  addingNote = false;
  updating = false;

  actionOptions = [
    { value: "escalate", label: "Escalate case" },
    { value: "request_info", label: "Request Info" },
    { value: "assign", label: "Assign to Another Officer" },
    { value: "resolve", label: "Mark Resolved" },
    { value: "close", label: "Close Case" },
  ];

  constructor(
    private route: ActivatedRoute,
    private complaintService: ComplaintService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      this.complaintService.getComplaintById(id).subscribe((c) => {
        this.complaint = c || null;
        this.loading = false;
      });
    }
  }

  toggleUpdatePanel(): void {
    this.showUpdatePanel = !this.showUpdatePanel;
  }

  updateStatus(): void {
    if (!this.complaint || !this.selectedAction) return;
    this.updating = true;
    const statusMap: Record<string, ComplaintStatus> = {
      escalate: ComplaintStatus.ESCALATED,
      resolve: ComplaintStatus.RESOLVED,
      close: ComplaintStatus.CLOSED,
      request_info: ComplaintStatus.AWAITING_INFO,
      assign: ComplaintStatus.IN_PROGRESS,
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

  addNote(): void {
    if (!this.complaint || !this.noteText.trim()) return;
    this.addingNote = true;
    this.complaintService
      .addNote(this.complaint.id, this.noteText, true)
      .subscribe({
        next: () => {
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
