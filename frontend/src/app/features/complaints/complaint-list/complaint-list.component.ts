import { Component, OnInit, ViewChild, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ComplaintService } from "../../../core/services/complaint.service";
import {
  Complaint,
  COMPLAINT_TYPE_LABELS,
} from "../../../core/models/complaint.model";
import { AuthService } from "../../../core/services/auth.service";
import { User } from "../../../core/models/user.model";

@Component({
  standalone: false,
  selector: "app-complaint-list",
  templateUrl: "./complaint-list.component.html",
  styleUrls: ["./complaint-list.component.scss"],
})
export class ComplaintListComponent implements OnInit, OnDestroy {
  displayedColumns = [
    "workerName",
    "referenceNo",
    "dateSubmitted",
    "type",
    "status",
    "assignedTo",
    "action",
  ];
  dataSource = new MatTableDataSource<Complaint>([]);
  loading = true;
  error = false;
  typeLabels = COMPLAINT_TYPE_LABELS;
  searchValue = "";
  caseOfficers: User[] = [];
  assigningId: string | null = null;
  isSupervisor = false;
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private complaintService: ComplaintService,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isSupervisor = this.authService.currentUser?.role === "SUPERVISOR";
    this.loadComplaints();
    this.authService
      .getCaseOfficers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((officers) => (this.caseOfficers = officers));
  }

  loadComplaints(): void {
    this.loading = true;
    this.error = false;
    this.complaintService
      .getComplaints({ page: 0, pageSize: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data;
          this.loading = false;
          setTimeout(() => {
            if (this.paginator) this.dataSource.paginator = this.paginator;
            if (this.sort) this.dataSource.sort = this.sort;
          });
        },
        error: () => {
          this.loading = false;
          this.error = true;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilter(): void {
    this.dataSource.filter = this.searchValue.trim().toLowerCase();
  }

  viewComplaint(complaint: Complaint): void {
    this.router.navigate(["/complaints", complaint.id]);
  }

  assignOfficer(complaint: Complaint, officerId: string): void {
    const officer = this.caseOfficers.find((o) => o.id === officerId);
    if (!officer || officerId === complaint.assignedTo) return;
    this.assigningId = complaint.id;
    this.complaintService
      .assignComplaint(complaint.id, officer.id, officer.name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.assigningId = null;
          this.loadComplaints();
        },
        error: () => {
          this.assigningId = null;
        },
      });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      "In Progress": "badge-blue",
      "Under Review": "badge-purple",
      Investigation: "badge-orange",
      Escalate: "badge-red",
      Resolved: "badge-green",
      Closed: "badge-gray",
      Submitted: "badge-blue",
      "Pending Verification": "badge-orange",
      Draft: "badge-gray",
      "Awaiting Info": "badge-orange",
    };
    return map[status] || "badge-gray";
  }
}
