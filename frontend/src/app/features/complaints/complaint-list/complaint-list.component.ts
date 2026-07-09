import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { PageEvent } from "@angular/material/paginator";
import { Sort, SortDirection } from "@angular/material/sort";
import { Subject } from "rxjs";
import { debounceTime, takeUntil } from "rxjs/operators";
import { ComplaintService } from "../../../core/services/complaint.service";
import {
  Complaint,
  ComplaintFilter,
  ComplaintType,
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
    "country",
    "type",
    "status",
    "assignedTo",
    "action",
  ];
  // Holds only the current page of rows; pagination is driven by the server.
  dataSource = new MatTableDataSource<Complaint>([]);
  total = 0;
  loading = true;
  // True only until the first response; keeps the table mounted (no skeleton
  // flash) on subsequent page/sort/filter refetches.
  initialLoading = true;
  error = false;
  searchValue = "";
  selectedType: ComplaintType | "ALL" = "ALL";
  // Filled from /complaints/types after login/path filters are known.
  typeOptions: ComplaintType[] = [];
  filteredTypeOptions: ComplaintType[] = [];
  typeSearchOpen = false;
  typeSearchTerm = "";
  selectedCountry = "ALL";
  countryOptions: string[] = [];
  filteredCountryOptions: string[] = [];
  countrySearchOpen = false;
  countrySearchTerm = "";
  caseOfficers: User[] = [];
  officerSearchTerm = "";
  assigningId: string | null = null;
  isSupervisor = false;
  pageIndex = 0;
  pageSize = 10;
  sortActive = "";
  sortDirection: SortDirection = "";
  private destroy$ = new Subject<void>();
  private search$ = new Subject<void>();

  @ViewChild("typeSearchInput")
  typeSearchInput!: ElementRef<HTMLInputElement>;
  @ViewChild("countrySearchInput")
  countrySearchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private complaintService: ComplaintService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.isSupervisor = this.authService.currentUser?.role === "SUPERVISOR";

    // Get type filters from the API because categories can change in DB.
    this.complaintService
      .getComplaintTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe((types) => {
        this.typeOptions = types;
        this.filteredTypeOptions = [...types];
      });

    // Debounce free-text search so a request isn't fired on every keystroke.
    this.search$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.persistListState();
      });

    // The URL query string is the single source of truth: every page, sort, or
    // filter change is written there, which re-triggers a server fetch below.
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.searchValue = params.get("q") || "";
        const type = params.get("type") || "ALL";
        this.selectedType = this.isValidType(type) ? type : "ALL";
        this.selectedCountry = params.get("country") || "ALL";
        this.pageIndex = this.parsePositiveNumber(params.get("page"), 0);
        this.pageSize = this.parsePositiveNumber(params.get("pageSize"), 10);
        this.sortActive = params.get("sort") || "";
        this.sortDirection = this.parseSortDirection(params.get("dir"));
        this.loadComplaints();
      });

    this.loadCountryOptions();

    if (this.isSupervisor) {
      this.authService
        .getCaseOfficers()
        .pipe(takeUntil(this.destroy$))
        .subscribe((officers) => {
          this.caseOfficers = officers;
        });
    }
  }

  loadComplaints(): void {
    this.loading = true;
    this.error = false;
    this.complaintService
      .getComplaints(this.buildFilter())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.data;
          this.total = res.total;
          this.loading = false;
          this.initialLoading = false;
        },
        error: () => {
          this.loading = false;
          this.initialLoading = false;
          this.error = true;
        },
      });
  }

  private buildFilter(): ComplaintFilter {
    const filter: ComplaintFilter = {
      page: this.pageIndex,
      pageSize: this.pageSize,
    };

    const search = this.searchValue.trim();
    if (search) filter.search = search;
    if (this.selectedType !== "ALL") filter.type = [this.selectedType];
    if (this.selectedCountry !== "ALL") filter.branch = this.selectedCountry;
    if (this.sortActive && this.sortDirection) {
      filter.sortBy = this.sortActive;
      filter.sortDirection = this.sortDirection;
    }

    return filter;
  }

  private loadCountryOptions(): void {
    this.complaintService
      .getComplaintCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.countryOptions = countries;
        this.filteredCountryOptions = [...countries];
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(): void {
    this.search$.next();
  }

  applyFilter(): void {
    this.pageIndex = 0;
    this.persistListState();
  }

  openTypeSearch(event: Event): void {
    event.stopPropagation();
    this.typeSearchOpen = true;
    this.typeSearchTerm = "";
    this.filteredTypeOptions = [...this.typeOptions];

    setTimeout(() => {
      this.typeSearchInput?.nativeElement?.focus();
    }, 50);
  }

  closeTypeSearch(): void {
    this.typeSearchOpen = false;
    this.typeSearchTerm = "";
  }

  filterTypeOptions(): void {
    const term = this.typeSearchTerm.toLowerCase();
    this.filteredTypeOptions = this.typeOptions.filter((type) =>
      this.getTypeLabel(type).toLowerCase().includes(term),
    );
  }

  selectTypeFilter(value: ComplaintType | "ALL"): void {
    this.selectedType = value;
    this.typeSearchOpen = false;
    this.typeSearchTerm = "";
    this.applyFilter();
  }

  clearTypeFilter(): void {
    this.selectedType = "ALL";
    this.applyFilter();
  }

  getTypeLabel(type: ComplaintType | "ALL"): string {
    // Type is already an English label from the API.
    return type === "ALL" ? "All Categories" : type;
  }

  openCountrySearch(event: Event): void {
    event.stopPropagation();
    this.countrySearchOpen = true;
    this.countrySearchTerm = "";
    this.filteredCountryOptions = [...this.countryOptions];

    setTimeout(() => {
      this.countrySearchInput?.nativeElement?.focus();
    }, 50);
  }

  closeCountrySearch(): void {
    this.countrySearchOpen = false;
    this.countrySearchTerm = "";
  }

  filterCountryOptions(): void {
    const term = this.countrySearchTerm.toLowerCase();
    this.filteredCountryOptions = this.countryOptions.filter((country) =>
      country.toLowerCase().includes(term),
    );
  }

  selectCountryFilter(value: string): void {
    this.selectedCountry = value;
    this.countrySearchOpen = false;
    this.countrySearchTerm = "";
    this.applyFilter();
  }

  clearCountryFilter(): void {
    this.selectedCountry = "ALL";
    this.applyFilter();
  }

  getCountryLabel(country: string): string {
    return country === "ALL" ? "All Countries" : country;
  }

  getComplaintCountry(complaint: Complaint): string {
    return complaint.branch || complaint.workerAddress || "Not provided";
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

  // Called when the assign dropdown opens or closes. On open I clear the
  // search box so every officer is visible again.
  onAssignPanelToggle(opened: boolean): void {
    if (opened) {
      this.officerSearchTerm = "";
    }
  }

  // True when an officer's name matches what's typed in the search box. We
  // keep every officer as an option and just hide the ones that don't match,
  // so no dropdown ever loses its selected value while another is searched.
  officerMatches(officer: User): boolean {
    const term = this.officerSearchTerm.toLowerCase().trim();
    return officer.name.toLowerCase().includes(term);
  }

  // Whether any officer matches the current search 
  get hasMatchingOfficers(): boolean {
    return this.caseOfficers.some((officer) => this.officerMatches(officer));
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

  private persistListState(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchValue.trim() || null,
        type: this.selectedType === "ALL" ? null : this.selectedType,
        country: this.selectedCountry === "ALL" ? null : this.selectedCountry,
        page: this.pageIndex || null,
        pageSize: this.pageSize === 10 ? null : this.pageSize,
        sort: this.sortActive || null,
        dir: this.sortDirection || null,
      },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  private isValidType(type: string): type is ComplaintType | "ALL" {
    // URL can contain a category before typeOptions finishes loading.
    return type === "ALL" || (typeof type === "string" && type.trim().length > 0);
  }

  private parsePositiveNumber(value: string | null, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private parseSortDirection(value: string | null): SortDirection {
    return value === "asc" || value === "desc" ? value : "";
  }
}
