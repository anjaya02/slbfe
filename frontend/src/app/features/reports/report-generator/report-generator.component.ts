import {
  Component,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from "@angular/core";
import { ChartConfiguration } from "chart.js";
import { BaseChartDirective } from "ng2-charts";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ReportService } from "../../../core/services/report.service";
import { ToastService } from "../../../core/services/toast.service";
import {
  OfficerPerformanceItem,
  ReportData,
  ReportFilter,
  ReportType,
} from "../../../core/models/report.model";

type PdfDocument = InstanceType<typeof import("jspdf")["default"]>;
type PdfColor = [number, number, number];

interface PdfLayout {
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;
}

@Component({
  standalone: false,
  selector: "app-report-generator",
  templateUrl: "./report-generator.component.html",
  styleUrls: ["./report-generator.component.scss"],
})
export class ReportGeneratorComponent implements OnInit, OnDestroy {
  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;

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
    if (!this.reportData || this.exportingPdf) {
      return;
    }

    this.exportingPdf = true;

    try {
      const chartImages = this.getChartImages();
      const emblemDataUrl = await this.loadAssetAsDataUrl(
        "assets/Emblem_of_Sri_Lanka.png",
      );
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      this.buildReportPdf(pdf, this.reportData, chartImages, emblemDataUrl);
      pdf.save(`report-${new Date().toISOString().split("T")[0]}.pdf`);
      this.toast.success("Report downloaded successfully");
    } catch {
      this.toast.error("Failed to download PDF");
    } finally {
      this.exportingPdf = false;
    }
  }

  private getChartImages(): { status?: string; trend?: string } {
    const chartList = this.charts?.toArray() || [];
    chartList.forEach((chart) => chart.chart?.update("none"));

    return {
      status: chartList[0]?.chart?.toBase64Image("image/png", 1),
      trend: chartList[1]?.chart?.toBase64Image("image/png", 1),
    };
  }

  private buildReportPdf(
    pdf: PdfDocument,
    reportData: ReportData,
    chartImages: { status?: string; trend?: string },
    emblemDataUrl: string | null,
  ): void {
    const layout: PdfLayout = {
      margin: 14,
      pageWidth: pdf.internal.pageSize.getWidth(),
      pageHeight: pdf.internal.pageSize.getHeight(),
      contentWidth: pdf.internal.pageSize.getWidth() - 28,
      y: 0,
    };

    this.drawReportHeader(pdf, layout, reportData, emblemDataUrl);
    layout.y = 52;

    this.drawSummaryCards(pdf, layout, reportData);
    this.drawSectionTitle(pdf, layout, "Visual Overview");
    this.drawChartGrid(pdf, layout, chartImages, reportData);
    this.drawSectionTitle(pdf, layout, "Status Breakdown");
    this.drawStatusBreakdownTable(pdf, layout, reportData);
    this.drawSectionTitle(pdf, layout, "Monthly Trend");
    this.drawTrendTable(pdf, layout, reportData);
    this.drawSectionTitle(pdf, layout, "Officer Performance");
    this.drawOfficerTable(pdf, layout, reportData.officerPerformance);
    this.drawPdfFooters(pdf);
  }

  private drawReportHeader(
    pdf: PdfDocument,
    layout: PdfLayout,
    reportData: ReportData,
    emblemDataUrl: string | null,
  ): void {
    pdf.setFillColor(0, 68, 128);
    pdf.rect(0, 0, layout.pageWidth, 38, "F");
    pdf.setFillColor(76, 130, 214);
    pdf.rect(0, 38, layout.pageWidth, 3, "F");

    if (emblemDataUrl) {
      pdf.addImage(emblemDataUrl, "PNG", layout.margin, 9, 12, 16);
    }

    const leftColumnX = layout.margin + 18;
    const leftColumnWidth = 110;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    const ministryLines = pdf.splitTextToSize(
      "Ministry of Foreign Affairs, Foreign Employment & Tourism",
      leftColumnWidth,
    );

    pdf.setTextColor(255, 255, 255);
    pdf.text(ministryLines, leftColumnX, 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(
      "Consular Affairs Division",
      leftColumnX,
      15 + ministryLines.length * 5,
    );
    pdf.text("Management Report", leftColumnX, 31);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text(reportData.title, layout.pageWidth - layout.margin, 18, {
      align: "right",
      maxWidth: 58,
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(
      `Generated ${this.formatDateTime(reportData.generatedAt)}`,
      layout.pageWidth - layout.margin,
      25,
      { align: "right" },
    );

    const rangeText = this.getReportRangeText(reportData.filters);
    if (rangeText) {
      pdf.text(rangeText, layout.pageWidth - layout.margin, 31, {
        align: "right",
      });
    }
  }

  private drawCompactPageHeader(pdf: PdfDocument, layout: PdfLayout): void {
    pdf.setFillColor(0, 68, 128);
    pdf.rect(0, 0, layout.pageWidth, 13, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Management Report", layout.margin, 8.5);
  }

  private drawSummaryCards(
    pdf: PdfDocument,
    layout: PdfLayout,
    reportData: ReportData,
  ): void {
    const gap = 4;
    const cardWidth = (layout.contentWidth - gap * 3) / 4;
    const cards: Array<[string, string, PdfColor]> = [
      ["Total Cases", `${reportData.summary.totalCases}`, [0, 68, 128]],
      ["Resolved", `${reportData.summary.resolvedCases}`, [34, 197, 94]],
      ["Pending", `${reportData.summary.pendingCases}`, [245, 158, 11]],
      [
        "Avg Resolution",
        `${reportData.summary.averageResolutionDays} days`,
        [139, 92, 246],
      ],
    ];

    cards.forEach(([label, value, color], index) => {
      const x = layout.margin + index * (cardWidth + gap);
      pdf.setDrawColor(224, 231, 255);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, layout.y, cardWidth, 24, 3, 3, "FD");
      pdf.setFillColor(...color);
      pdf.roundedRect(x, layout.y, 2.5, 24, 1.5, 1.5, "F");
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(label.toUpperCase(), x + 6, layout.y + 8);
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(13);
      pdf.text(value, x + 6, layout.y + 17);
    });

    layout.y += 34;
  }

  private drawChartGrid(
    pdf: PdfDocument,
    layout: PdfLayout,
    chartImages: { status?: string; trend?: string },
    reportData: ReportData,
  ): void {
    const gap = 6;
    const cardWidth = (layout.contentWidth - gap) / 2;
    const cardHeight = 72;

    this.ensurePdfSpace(pdf, layout, cardHeight + 8);
    this.drawChartCard(
      pdf,
      layout.margin,
      layout.y,
      cardWidth,
      cardHeight,
      "Status Breakdown",
      chartImages.status,
      () => this.drawStatusLegend(pdf, layout.margin + 8, layout.y + 22, reportData),
    );
    this.drawChartCard(
      pdf,
      layout.margin + cardWidth + gap,
      layout.y,
      cardWidth,
      cardHeight,
      "Monthly Trend",
      chartImages.trend,
      () => this.drawTrendFallback(pdf, layout.margin + cardWidth + gap + 8, layout.y + 22, reportData),
    );
    layout.y += cardHeight + 9;
  }

  private drawChartCard(
    pdf: PdfDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    imageData: string | undefined,
    drawFallback: () => void,
  ): void {
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, height, 3, 3, "FD");
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(title, x + 6, y + 9);

    if (imageData) {
      pdf.addImage(imageData, "PNG", x + 6, y + 14, width - 12, height - 20);
      return;
    }

    drawFallback();
  }

  private drawStatusLegend(
    pdf: PdfDocument,
    x: number,
    y: number,
    reportData: ReportData,
  ): void {
    const colors = this.getStatusColors();
    reportData.statusBreakdown.forEach((item, index) => {
      const itemY = y + index * 8;
      pdf.setFillColor(...(colors[item.status] || [148, 163, 184]));
      pdf.rect(x, itemY - 3, 4, 4, "F");
      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(
        `${item.status}: ${item.count} (${item.percentage.toFixed(1)}%)`,
        x + 7,
        itemY,
      );
    });
  }

  private drawTrendFallback(
    pdf: PdfDocument,
    x: number,
    y: number,
    reportData: ReportData,
  ): void {
    reportData.monthlyTrend.slice(0, 5).forEach((item, index) => {
      const itemY = y + index * 8;
      pdf.setTextColor(51, 65, 85);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(
        `${item.month}: ${item.submitted} submitted, ${item.resolved} resolved`,
        x,
        itemY,
      );
    });
  }

  private drawSectionTitle(
    pdf: PdfDocument,
    layout: PdfLayout,
    title: string,
  ): void {
    this.ensurePdfSpace(pdf, layout, 16);
    pdf.setTextColor(0, 68, 128);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(title, layout.margin, layout.y);
    pdf.setDrawColor(191, 219, 254);
    pdf.line(
      layout.margin,
      layout.y + 3,
      layout.pageWidth - layout.margin,
      layout.y + 3,
    );
    layout.y += 10;
  }

  private drawStatusBreakdownTable(
    pdf: PdfDocument,
    layout: PdfLayout,
    reportData: ReportData,
  ): void {
    this.drawTable(
      pdf,
      layout,
      ["Status", "Count", "Percentage"],
      reportData.statusBreakdown.map((item) => [
        item.status,
        `${item.count}`,
        `${item.percentage.toFixed(1)}%`,
      ]),
      [92, 45, 45],
    );
  }

  private drawTrendTable(
    pdf: PdfDocument,
    layout: PdfLayout,
    reportData: ReportData,
  ): void {
    this.drawTable(
      pdf,
      layout,
      ["Month", "Submitted", "Resolved"],
      reportData.monthlyTrend.map((item) => [
        item.month,
        `${item.submitted}`,
        `${item.resolved}`,
      ]),
      [92, 45, 45],
    );
  }

  private drawOfficerTable(
    pdf: PdfDocument,
    layout: PdfLayout,
    officers: OfficerPerformanceItem[],
  ): void {
    if (!officers.length) {
      this.drawEmptyState(
        pdf,
        layout,
        "No assigned-officer data is available for the selected filters.",
      );
      return;
    }

    this.drawTable(
      pdf,
      layout,
      ["Officer", "Handled", "Resolved", "Avg Days"],
      officers.map((officer) => [
        officer.officerName,
        `${officer.casesHandled}`,
        `${officer.casesResolved}`,
        `${officer.avgResolutionDays}d`,
      ]),
      [82, 33, 33, 34],
    );
  }

  private drawTable(
    pdf: PdfDocument,
    layout: PdfLayout,
    headers: string[],
    rows: string[][],
    columnWidths: number[],
  ): void {
    if (!rows.length) {
      this.drawEmptyState(pdf, layout, "No data is available.");
      return;
    }

    this.ensurePdfSpace(pdf, layout, 18);
    this.drawTableHeader(pdf, layout, headers, columnWidths);

    rows.forEach((row, rowIndex) => {
      const wrappedCells = row.map((cell, index) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        return pdf.splitTextToSize(cell, columnWidths[index] - 8);
      });
      const rowHeight = Math.max(
        10,
        ...wrappedCells.map((lines) => 5 + lines.length * 4.2),
      );

      this.ensurePdfSpace(pdf, layout, rowHeight + 2);
      if (layout.y < 25) {
        this.drawTableHeader(pdf, layout, headers, columnWidths);
      }

      let x = layout.margin;
      pdf.setDrawColor(226, 232, 240);
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(255, 255, 255);
      } else {
        pdf.setFillColor(248, 250, 252);
      }
      pdf.rect(layout.margin, layout.y, layout.contentWidth, rowHeight, "FD");

      wrappedCells.forEach((lines, index) => {
        pdf.setTextColor(51, 65, 85);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(lines, x + 4, layout.y + 6);
        x += columnWidths[index];
      });

      layout.y += rowHeight;
    });

    layout.y += 7;
  }

  private drawTableHeader(
    pdf: PdfDocument,
    layout: PdfLayout,
    headers: string[],
    columnWidths: number[],
  ): void {
    let x = layout.margin;
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.rect(layout.margin, layout.y, layout.contentWidth, 10, "FD");
    pdf.setTextColor(0, 68, 128);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);

    headers.forEach((header, index) => {
      pdf.text(header.toUpperCase(), x + 4, layout.y + 6.5);
      x += columnWidths[index];
    });

    layout.y += 10;
  }

  private drawEmptyState(
    pdf: PdfDocument,
    layout: PdfLayout,
    message: string,
  ): void {
    this.ensurePdfSpace(pdf, layout, 16);
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(layout.margin, layout.y, layout.contentWidth, 14, 3, 3, "FD");
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(message, layout.margin + 6, layout.y + 9);
    layout.y += 20;
  }

  private ensurePdfSpace(
    pdf: PdfDocument,
    layout: PdfLayout,
    neededHeight: number,
  ): void {
    if (layout.y + neededHeight <= layout.pageHeight - 18) {
      return;
    }

    pdf.addPage();
    this.drawCompactPageHeader(pdf, layout);
    layout.y = 24;
  }

  private drawPdfFooters(pdf: PdfDocument): void {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text("SLBFE - Consular Affairs Division", 14, pageHeight - 8);
      pdf.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
        align: "right",
      });
    }
  }

  private async loadAssetAsDataUrl(assetPath: string): Promise<string | null> {
    try {
      const response = await fetch(assetPath);
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private getStatusColors(): Record<string, PdfColor> {
    return {
      Submitted: [107, 114, 128],
      "Under Review": [59, 130, 246],
      "In Progress": [168, 85, 247],
      "Awaiting Info": [245, 158, 11],
      Resolved: [16, 185, 129],
      Closed: [31, 41, 55],
    };
  }

  private getReportRangeText(filter: ReportFilter): string {
    if (filter.reportType !== "CUSTOM") {
      return "";
    }

    const from = filter.dateFrom ? this.formatShortDate(filter.dateFrom) : "Any";
    const to = filter.dateTo ? this.formatShortDate(filter.dateTo) : "Any";
    return `${from} - ${to}`;
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat("en-LK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  private formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat("en-LK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
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
