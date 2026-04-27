import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ComplaintService } from "../../core/services/complaint.service";
import { AuthService } from "../../core/services/auth.service";
import {
  DashboardStats,
  WeeklyData,
  MonthlyData,
} from "../../core/models/complaint.model";
import { ChartConfiguration } from "chart.js";

@Component({
  standalone: false,
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  loading = true;
  error = false;
  dashboardHeading = "Manage Cases.";
  dashboardSubheading = "Track Progress.";
  dashboardTagline = "Ensure Resolution.";
  private destroy$ = new Subject<void>();
  weeklyChartData: ChartConfiguration<"bar">["data"] = {
    labels: [],
    datasets: [],
  };
  weeklyChartOptions: ChartConfiguration<"bar">["options"] = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1500, easing: "easeOutQuart" },
    plugins: { legend: { display: true, position: "bottom" } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { callback: (v: string | number) => +v / 1000 + "K" },
      },
      y: { grid: { display: false } },
    },
  };
  yearlyChartData: ChartConfiguration<"line">["data"] = {
    labels: [],
    datasets: [],
  };
  yearlyChartOptions: ChartConfiguration<"line">["options"] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 2000, easing: "easeOutQuart" },
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { display: false },
    },
    elements: { line: { tension: 0.4 }, point: { radius: 3, hoverRadius: 6 } },
  };

  constructor(
    private complaintService: ComplaintService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.complaintService
      .getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: DashboardStats) => {
          this.stats = data;
          this.applyRoleCopy(data);
          this.loading = false;
          this.buildWeeklyChart(data);
          this.buildYearlyChart(data);
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

  get totalCasesLabel(): string {
    return this.isCaseOfficer ? "Assigned Cases" : "Total Cases";
  }

  get resolvedCasesLabel(): string {
    return this.isCaseOfficer ? "Resolved By You" : "Resolved Cases";
  }

  get pendingReviewLabel(): string {
    return this.isCaseOfficer ? "Open Assigned" : "Open Cases";
  }

  get weeklyChartTitle(): string {
    return this.isCaseOfficer
      ? "Your Weekly Case Load"
      : "Weekly Case Overview";
  }

  get yearlyChartTitle(): string {
    return this.isCaseOfficer
      ? "Your Yearly Case Trend"
      : "Yearly Case Overview";
  }

  get weeklyChartSummary(): number {
    return (this.stats?.weeklyData || []).reduce(
      (total, day) => total + day.submitted,
      0,
    );
  }

  get yearlyChartSummary(): number {
    return (this.stats?.monthlyData || []).reduce(
      (total, month) => total + month.count,
      0,
    );
  }

  get isCaseOfficer(): boolean {
    return this.authService.currentUser?.role === "CASE_OFFICER";
  }

  private applyRoleCopy(data: DashboardStats): void {
    if (data.scope === "ASSIGNED") {
      this.dashboardHeading = "Focus Assigned Cases.";
      this.dashboardSubheading = "Move Cases Forward.";
      this.dashboardTagline = "Close What You Own.";
      return;
    }

    this.dashboardHeading = "Manage Cases.";
    this.dashboardSubheading = "Track Progress.";
    this.dashboardTagline = "Ensure Resolution.";
  }

  private buildWeeklyChart(data: DashboardStats): void {
    this.weeklyChartData = {
      labels: data.weeklyData.map((d: WeeklyData) => d.day),
      datasets: [
        {
          label: "Submitted",
          data: data.weeklyData.map((d: WeeklyData) => d.submitted),
          backgroundColor: "#004080",
          borderRadius: 6,
          barPercentage: 0.7,
        },
        {
          label: "Resolved",
          data: data.weeklyData.map((d: WeeklyData) => d.resolved),
          backgroundColor: "#84C341", // Mobitel Green
          borderRadius: 6,
          barPercentage: 0.7,
        },
        {
          label: "Pending",
          data: data.weeklyData.map((d: WeeklyData) => d.pending),
          backgroundColor: "#FF9E1B", // Warning Orange
          borderRadius: 6,
          barPercentage: 0.7,
        },
      ],
    };
  }

  private buildYearlyChart(data: DashboardStats): void {
    this.yearlyChartData = {
      labels: data.monthlyData.map((d: MonthlyData) => d.month),
      datasets: [
        {
          label: "Cases",
          data: data.monthlyData.map((d: MonthlyData) => d.count),
          borderColor: "#004080",
          backgroundColor: "rgba(0, 64, 128, 0.08)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#004080",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    };
  }
}
