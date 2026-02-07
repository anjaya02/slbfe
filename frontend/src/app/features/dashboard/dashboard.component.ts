import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ComplaintService } from "../../core/services/complaint.service";
import {
  DashboardStats,
  WeeklyData,
  MonthlyData,
} from "../../core/models/complaint.model";
import { ChartConfiguration } from "chart.js";

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  loading = true;
  error = false;
  private destroy$ = new Subject<void>();

  // Weekly Chart
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

  // Yearly Chart
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

  constructor(private complaintService: ComplaintService) {}

  ngOnInit(): void {
    this.complaintService
      .getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: DashboardStats) => {
          this.stats = data;
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
