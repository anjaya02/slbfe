import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { delay, map, take } from "rxjs/operators";
import { Complaint, ComplaintStatus } from "../models/complaint.model";
import {
  MonthlyTrendItem,
  OfficerPerformanceItem,
  ReportData,
  ReportFilter,
  StatusBreakdownItem,
  TypeBreakdownItem,
} from "../models/report.model";
import { ComplaintService } from "./complaint.service";

@Injectable({ providedIn: "root" })
export class ReportService {
  constructor(private complaintService: ComplaintService) {}

  generateReport(filter: ReportFilter): Observable<ReportData> {
    return this.complaintService.complaints$.pipe(
      take(1),
      map((complaints) => this.buildReportData(complaints, filter)),
      delay(300),
    );
  }

  private getReportTitle(type: string): string {
    const titles: Record<string, string> = {
      MONTHLY: "Monthly Report",
      QUARTERLY: "Quarterly Report",
      ANNUAL: "Annual Report",
      CUSTOM: "Custom Range Report",
    };
    return titles[type] || "Report";
  }

  private buildReportData(
    complaints: Complaint[],
    filter: ReportFilter,
  ): ReportData {
    const filteredComplaints = this.applyFilter(complaints, filter);
    const totalCases = filteredComplaints.length;
    const resolvedStatuses = new Set<ComplaintStatus>([
      ComplaintStatus.RESOLVED,
      ComplaintStatus.CLOSED,
    ]);

    const resolvedCases = filteredComplaints.filter((complaint) =>
      resolvedStatuses.has(complaint.status),
    );
    const escalatedCases = filteredComplaints.filter(
      (complaint) => complaint.status === ComplaintStatus.ESCALATED,
    ).length;
    const pendingCases = filteredComplaints.filter(
      (complaint) => !resolvedStatuses.has(complaint.status),
    ).length;
    const resolutionDays = resolvedCases.map((complaint) =>
      this.getResolutionDays(complaint),
    );
    const averageResolutionDays = resolutionDays.length
      ? this.round(
          resolutionDays.reduce((sum, days) => sum + days, 0) /
            resolutionDays.length,
        )
      : 0;

    return {
      title: this.getReportTitle(filter.reportType),
      generatedAt: new Date(),
      filters: filter,
      summary: {
        totalCases,
        resolvedCases: resolvedCases.length,
        resolvedPercentage: totalCases
          ? this.round((resolvedCases.length / totalCases) * 100)
          : 0,
        averageResolutionDays,
        escalatedCases,
        pendingCases,
      },
      statusBreakdown: this.buildStatusBreakdown(filteredComplaints, totalCases),
      typeBreakdown: this.buildTypeBreakdown(filteredComplaints, totalCases),
      monthlyTrend: this.buildMonthlyTrend(filteredComplaints, filter),
      officerPerformance: this.buildOfficerPerformance(filteredComplaints),
    };
  }

  private applyFilter(
    complaints: Complaint[],
    filter: ReportFilter,
  ): Complaint[] {
    const { startDate, endDate } = this.getDateRange(filter, complaints);

    return complaints.filter((complaint) => {
      const submittedTime = new Date(complaint.dateSubmitted).getTime();
      if (submittedTime < startDate.getTime() || submittedTime > endDate.getTime()) {
        return false;
      }
      if (filter.statuses?.length && !filter.statuses.includes(complaint.status)) {
        return false;
      }
      if (filter.types?.length && !filter.types.includes(complaint.type)) {
        return false;
      }
      if (filter.branch && complaint.branch !== filter.branch) {
        return false;
      }
      if (filter.officerId && complaint.assignedTo !== filter.officerId) {
        return false;
      }
      return true;
    });
  }

  private getDateRange(
    filter: ReportFilter,
    complaints: Complaint[],
  ): { startDate: Date; endDate: Date } {
    const referenceDate = this.getReferenceDate(complaints);

    if (filter.reportType === "CUSTOM") {
      const startDate = filter.dateFrom
        ? new Date(filter.dateFrom)
        : new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const endDate = filter.dateTo ? new Date(filter.dateTo) : new Date(referenceDate);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }

    if (filter.reportType === "MONTHLY") {
      return {
        startDate: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
        endDate: new Date(
          referenceDate.getFullYear(),
          referenceDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      };
    }

    if (filter.reportType === "QUARTERLY") {
      const quarterStartMonth = Math.floor(referenceDate.getMonth() / 3) * 3;
      return {
        startDate: new Date(referenceDate.getFullYear(), quarterStartMonth, 1),
        endDate: new Date(
          referenceDate.getFullYear(),
          quarterStartMonth + 3,
          0,
          23,
          59,
          59,
          999,
        ),
      };
    }

    return {
      startDate: new Date(referenceDate.getFullYear(), 0, 1),
      endDate: new Date(referenceDate.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }

  private buildStatusBreakdown(
    complaints: Complaint[],
    totalCases: number,
  ): StatusBreakdownItem[] {
    const counts = new Map<string, number>();

    complaints.forEach((complaint) => {
      counts.set(complaint.status, (counts.get(complaint.status) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: totalCases ? this.round((count / totalCases) * 100) : 0,
      }))
      .sort((left, right) => right.count - left.count);
  }

  private buildTypeBreakdown(
    complaints: Complaint[],
    totalCases: number,
  ): TypeBreakdownItem[] {
    const labels: Record<Complaint["type"], string> = {
      SALARY_ISSUES: "Salary Issues",
      LEAVE_ISSUES: "Leave Issues",
      WORK_ENVIRONMENT: "Work Environment",
      SUPERVISOR_ISSUES: "Supervisor Issues",
      OTHER: "Other",
    };
    const counts = new Map<string, number>();

    complaints.forEach((complaint) => {
      const label = labels[complaint.type];
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalCases ? this.round((count / totalCases) * 100) : 0,
      }))
      .sort((left, right) => right.count - left.count);
  }

  private buildMonthlyTrend(
    complaints: Complaint[],
    filter: ReportFilter,
  ): MonthlyTrendItem[] {
    const { startDate, endDate } = this.getDateRange(filter, complaints);
    const monthBuckets: MonthlyTrendItem[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (cursor <= endDate) {
      monthBuckets.push({
        month: cursor.toLocaleString("en", { month: "short" }),
        submitted: 0,
        resolved: 0,
        escalated: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    complaints.forEach((complaint) => {
      const submitted = new Date(complaint.dateSubmitted);
      const monthIndex =
        (submitted.getFullYear() - startDate.getFullYear()) * 12 +
        submitted.getMonth() -
        startDate.getMonth();

      if (!monthBuckets[monthIndex]) {
        return;
      }

      monthBuckets[monthIndex].submitted += 1;
      if (
        complaint.status === ComplaintStatus.RESOLVED ||
        complaint.status === ComplaintStatus.CLOSED
      ) {
        monthBuckets[monthIndex].resolved += 1;
      }
      if (complaint.status === ComplaintStatus.ESCALATED) {
        monthBuckets[monthIndex].escalated += 1;
      }
    });

    return monthBuckets;
  }

  private buildOfficerPerformance(
    complaints: Complaint[],
  ): OfficerPerformanceItem[] {
    const resolvedStatuses = new Set<ComplaintStatus>([
      ComplaintStatus.RESOLVED,
      ComplaintStatus.CLOSED,
    ]);
    const grouped = new Map<string, Complaint[]>();

    complaints.forEach((complaint) => {
      const officerName = complaint.assignedToName || "Unassigned";
      const officerCases = grouped.get(officerName) || [];
      officerCases.push(complaint);
      grouped.set(officerName, officerCases);
    });

    return Array.from(grouped.entries())
      .map(([officerName, officerCases]) => {
        const resolvedCases = officerCases.filter((complaint) =>
          resolvedStatuses.has(complaint.status),
        );
        const avgResolutionDays = resolvedCases.length
          ? this.round(
              resolvedCases.reduce(
                (sum, complaint) => sum + this.getResolutionDays(complaint),
                0,
              ) / resolvedCases.length,
            )
          : 0;
        const resolutionRate = officerCases.length
          ? resolvedCases.length / officerCases.length
          : 0;

        return {
          officerName,
          casesHandled: officerCases.length,
          casesResolved: resolvedCases.length,
          avgResolutionDays,
          satisfactionRating: this.round(3 + resolutionRate * 2),
        };
      })
      .sort((left, right) => right.casesHandled - left.casesHandled);
  }

  private getResolutionDays(complaint: Complaint): number {
    const submitted = new Date(complaint.dateSubmitted).getTime();
    const updated = new Date(complaint.dateUpdated).getTime();
    const dayInMs = 1000 * 60 * 60 * 24;
    return Math.max(1, this.round((updated - submitted) / dayInMs));
  }

  private round(value: number): number {
    return Number(value.toFixed(1));
  }

  private getReferenceDate(complaints: Complaint[]): Date {
    if (!complaints.length) {
      return new Date();
    }

    return complaints.reduce((latest, complaint) => {
      const submitted = new Date(complaint.dateSubmitted);
      return submitted > latest ? submitted : latest;
    }, new Date(complaints[0].dateSubmitted));
  }
}
