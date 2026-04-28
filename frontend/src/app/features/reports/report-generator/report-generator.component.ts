import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ChartConfiguration } from "chart.js";
import { BaseChartDirective } from "ng2-charts";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ReportService } from "../../../core/services/report.service";
import { ToastService } from "../../../core/services/toast.service";
import {
  ReportData,
  ReportFilter,
  ReportType,
} from "../../../core/models/report.model";

@Component({
  standalone: false,
  selector: "app-report-generator",
  templateUrl: "./report-generator.component.html",
  styleUrls: ["./report-generator.component.scss"],
})
export class ReportGeneratorComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @ViewChild("reportContent") reportContent?: ElementRef<HTMLDivElement>;

  reportData: ReportData | null = null;
  loading = false;
  exportingPdf = false;
  private destroy$ = new Subject<void>();
  selectedReportType: ReportType = "MONTHLY";
  startDate: Date | null = null;
  endDate: Date | null = null;

  reportTypes = [
    { value: "MONTHLY", label: "Monthly Report" },
    { value: "QUARTERLY", label: "Quarterly Report" },
    { value: "ANNUAL", label: "Annual Report" },
    { value: "CUSTOM", label: "Custom Range" },
  ];
  pieChartData: ChartConfiguration<"pie">["data"] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }],
  };
  pieChartOptions: ChartConfiguration<"pie">["options"] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "right", labels: { padding: 16 } } },
  };
  lineChartData: ChartConfiguration<"line">["data"] = {
    labels: [],
    datasets: [],
  };
  lineChartOptions: ChartConfiguration<"line">["options"] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
    plugins: { legend: { display: true, position: "top" } },
  };
  displayedColumns = ["name", "totalCases", "resolved", "avgDays"];

  constructor(
    private reportService: ReportService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.generateReport();
  }

  generateReport(): void {
    this.loading = true;
    const filter: ReportFilter = {
      reportType: this.selectedReportType,
      dateFrom: this.startDate || undefined,
      dateTo: this.endDate || undefined,
    };

    this.reportService
      .generateReport(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reportData = data;
          this.updateCharts(data);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateCharts(data: ReportData): void {
    const statusColors: Record<string, string> = {
      Submitted: "#6B7280",
      "Under Review": "#3B82F6",
      "In Progress": "#A855F7",
      "Awaiting Info": "#F59E0B",
      Resolved: "#10B981",
      Closed: "#1F2937",
    };
    this.pieChartData = {
      labels: data.statusBreakdown.map((s) => s.status.replace(/_/g, " ")),
      datasets: [
        {
          data: data.statusBreakdown.map((s) => s.count),
          backgroundColor: data.statusBreakdown.map(
            (s) => statusColors[s.status] || "#9CA3AF",
          ),
        },
      ],
    };
    this.lineChartData = {
      labels: data.monthlyTrend.map((m) => m.month),
      datasets: [
        {
          data: data.monthlyTrend.map((m) => m.submitted),
          label: "Submitted",
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59,130,246,0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          data: data.monthlyTrend.map((m) => m.resolved),
          label: "Resolved",
          borderColor: "#10B981",
          backgroundColor: "rgba(16,185,129,0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }

  async downloadPDF(): Promise<void> {
    if (!this.reportContent?.nativeElement || !this.reportData || this.exportingPdf) {
      return;
    }

    this.exportingPdf = true;

    try {
      await this.chart?.chart?.update();

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(this.reportContent.nativeElement, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const pageContentHeight = pageHeight - margin * 2;
      const imageData = canvas.toDataURL("image/png");

      let remainingHeight = imageHeight;
      let offsetY = margin;

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        offsetY,
        imageWidth,
        imageHeight,
        undefined,
        "FAST",
      );
      remainingHeight -= pageContentHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        offsetY = margin - (imageHeight - remainingHeight);
        pdf.addImage(
          imageData,
          "PNG",
          margin,
          offsetY,
          imageWidth,
          imageHeight,
          undefined,
          "FAST",
        );
        remainingHeight -= pageContentHeight;
      }

      pdf.save(`report-${new Date().toISOString().split("T")[0]}.pdf`);
      this.toast.success("Report downloaded successfully");
    } catch {
      this.toast.error("Failed to download PDF");
    } finally {
      this.exportingPdf = false;
    }
  }

  exportCSV(): void {
    if (!this.reportData) return;
    const rows = [["Status", "Count", "Percentage"]];
    this.reportData.statusBreakdown.forEach((s) => {
      rows.push([s.status, s.count.toString(), s.percentage.toFixed(1) + "%"]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success("Report exported successfully");
  }
}
