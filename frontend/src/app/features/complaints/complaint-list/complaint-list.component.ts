import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  ElementRef,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSort, Sort, SortDirection } from "@angular/material/sort";
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
export class ComplaintListComponent implements OnInit, AfterViewInit, OnDestroy {
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
  pageIndex = 0;
  pageSize = 10;
  sortActive = "";
  sortDirection: SortDirection = "";
  private destroy$ = new Subject<void>();
  private viewReady = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild("statusSearchInput")
  statusSearchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private complaintService: ComplaintService,
    private router: Router,
    private route: ActivatedRoute,
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
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.searchValue = params.get("q") || "";
      const status = params.get("status") || "ALL";
      this.selectedStatus = this.isValidStatus(status) ? status : "ALL";
      this.pageIndex = this.parsePositiveNumber(params.get("page"), 0);
      this.pageSize = this.parsePositiveNumber(params.get("pageSize"), 10);
      this.sortActive = params.get("sort") || "";
      this.sortDirection = this.parseSortDirection(params.get("dir"));
      this.applyTableFilter(false);
      this.syncTableControls();
    });
    this.loadComplaints();
    if (this.isSupervisor) {
      this.authService
        .getCaseOfficers()
        .pipe(takeUntil(this.destroy$))
        .subscribe((officers) => (this.caseOfficers = officers));
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.syncTableControls();
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
          setTimeout(() => this.syncTableControls());
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
    this.pageIndex = 0;
    this.applyTableFilter(true);
    this.persistListState();
  }

  private applyTableFilter(resetPage: boolean): void {
    this.dataSource.filter = JSON.stringify({
      search: this.searchValue.trim().toLowerCase(),
      status: this.selectedStatus,
    });

    if (resetPage && this.dataSource.paginator) {
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

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.persistListState();
  }

  onSortChange(sort: Sort): void {
    this.sortActive = sort.active;
    this.sortDirection = sort.direction;
    this.pageIndex = 0;
    this.dataSource.paginator?.firstPage();
    this.persistListState();
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

  private syncTableControls(): void {
    if (!this.viewReady || this.loading) return;

    if (this.paginator) {
      this.paginator.pageIndex = this.pageIndex;
      this.paginator.pageSize = this.pageSize;
      this.dataSource.paginator = this.paginator;
    }

    if (this.sort) {
      this.sort.active = this.sortActive;
      this.sort.direction = this.sortDirection;
      this.dataSource.sort = this.sort;
    }
  }

  private persistListState(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchValue.trim() || null,
        status: this.selectedStatus === "ALL" ? null : this.selectedStatus,
        page: this.pageIndex || null,
        pageSize: this.pageSize === 10 ? null : this.pageSize,
        sort: this.sortActive || null,
        dir: this.sortDirection || null,
      },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  private isValidStatus(status: string): boolean {
    return status === "ALL" || this.statusOptions.includes(status as ComplaintStatus);
  }

  private parsePositiveNumber(value: string | null, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private parseSortDirection(value: string | null): SortDirection {
    return value === "asc" || value === "desc" ? value : "";
  }
}
