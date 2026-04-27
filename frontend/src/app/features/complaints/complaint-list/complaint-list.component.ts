import {
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  ElementRef,
} from "@angular/core";
import { Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ComplaintService } from "../../../core/services/complaint.service";
import {
  Complaint,
  ComplaintStatus,
  COMPLAINT_TYPE_LABELS,
} from "../../../core/models/complaint.model";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
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
  selectedStatus = "ALL";
  statusOptions: string[] = Object.values(ComplaintStatus);
  filteredStatusOptions: string[] = [];
  statusSearchOpen = false;
  statusSearchTerm = "";
  caseOfficers: User[] = [];
  assigningId: string | null = null;
  isSupervisor = false;
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild("statusSearchInput")
  statusSearchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private complaintService: ComplaintService,
    private router: Router,
    private authService: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.isSupervisor = this.authService.currentUser?.role === "SUPERVISOR";
    this.filteredStatusOptions = [...this.statusOptions];
    this.dataSource.filterPredicate = (complaint, rawFilter) => {
      const filter = JSON.parse(rawFilter) as {
        search: string;
        status: string;
      };
      const matchesSearch = !filter.search
        ? true
        : [complaint.workerName, complaint.referenceNo]
            .join(" ")
            .toLowerCase()
            .includes(filter.search);
      const matchesStatus =
        filter.status === "ALL" ? true : complaint.status === filter.status;
      return matchesSearch && matchesStatus;
    };
    this.loadComplaints();
    if (this.isSupervisor) {
      this.authService
        .getCaseOfficers()
        .pipe(takeUntil(this.destroy$))
        .subscribe((officers) => (this.caseOfficers = officers));
    }
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
    this.dataSource.filter = JSON.stringify({
      search: this.searchValue.trim().toLowerCase(),
      status: this.selectedStatus,
    });

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openStatusSearch(event: Event): void {
    event.stopPropagation();
    this.statusSearchOpen = true;
    this.statusSearchTerm = "";
    this.filteredStatusOptions = [...this.statusOptions];

    setTimeout(() => {
      this.statusSearchInput?.nativeElement?.focus();
    }, 50);
  }

  closeStatusSearch(): void {
    this.statusSearchOpen = false;
    this.statusSearchTerm = "";
  }

  filterStatusOptions(): void {
    const term = this.statusSearchTerm.toLowerCase();
    this.filteredStatusOptions = this.statusOptions.filter((s) =>
      s.toLowerCase().includes(term),
    );
  }

  selectStatusFilter(value: string): void {
    this.selectedStatus = value;
    this.statusSearchOpen = false;
    this.statusSearchTerm = "";
    this.applyFilter();
  }

  clearStatusFilter(): void {
    this.selectedStatus = "ALL";
    this.applyFilter();
  }

  viewComplaint(complaint: Complaint): void {
    this.router.navigate(["/complaints", complaint.id]);
  }

  assignOfficer(complaint: Complaint, officerId: string): void {
    const officer = this.caseOfficers.find((o) => o.id === officerId);
    if (!officer || officerId === complaint.assignedTo) return;
    this.assigningId = complaint.id;
    this.complaintService
      .assignComplaint(complaint.id, officer.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.assigningId = null;
          this.toast.success(`Assigned to ${officer.name}`);
          this.loadComplaints();
        },
        error: () => {
          this.assigningId = null;
        },
      });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      "In Progress": "badge-teal",
      "Under Review": "badge-purple",
      Resolved: "badge-green",
      Closed: "badge-gray",
      Submitted: "badge-blue",
      "Awaiting Info": "badge-orange",
    };
    return map[status] || "badge-gray";
  }

  get pageTitle(): string {
    return this.isSupervisor ? "Problem List" : "My Assigned Cases";
  }
}
