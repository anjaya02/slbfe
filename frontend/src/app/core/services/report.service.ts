import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { delay } from "rxjs/operators";
import { ReportData, ReportFilter } from "../models/report.model";

@Injectable({ providedIn: "root" })
export class ReportService {
  generateReport(filter: ReportFilter): Observable<ReportData> {
    const data: ReportData = {
      title: this.getReportTitle(filter.reportType),
      generatedAt: new Date(),
      filters: filter,
      summary: {
        totalCases: 458,
        resolvedCases: 189,
        resolvedPercentage: 41.3,
        averageResolutionDays: 12.5,
        escalatedCases: 34,
        pendingCases: 87,
      },
      statusBreakdown: [
        { status: "Submitted", count: 45, percentage: 9.8 },
        { status: "Under Review", count: 67, percentage: 14.6 },
        { status: "Investigation", count: 89, percentage: 19.4 },
        { status: "Escalated", count: 34, percentage: 7.4 },
        { status: "In Progress", count: 47, percentage: 10.3 },
        { status: "Resolved", count: 189, percentage: 41.3 },
        { status: "Closed", count: 87, percentage: 19.0 },
      ],
      typeBreakdown: [
        { type: "Salary Issues", count: 156, percentage: 34.1 },
        { type: "Leave Issues", count: 98, percentage: 21.4 },
        { type: "Work Environment", count: 78, percentage: 17.0 },
        { type: "Supervisor Issues", count: 64, percentage: 14.0 },
        { type: "Other", count: 62, percentage: 13.5 },
      ],
      monthlyTrend: [
        { month: "Jan", submitted: 42, resolved: 28, escalated: 5 },
        { month: "Feb", submitted: 38, resolved: 32, escalated: 3 },
        { month: "Mar", submitted: 45, resolved: 30, escalated: 4 },
        { month: "Apr", submitted: 52, resolved: 35, escalated: 6 },
        { month: "May", submitted: 48, resolved: 33, escalated: 4 },
        { month: "Jun", submitted: 55, resolved: 40, escalated: 7 },
        { month: "Jul", submitted: 50, resolved: 38, escalated: 5 },
        { month: "Aug", submitted: 44, resolved: 36, escalated: 3 },
        { month: "Sep", submitted: 40, resolved: 30, escalated: 4 },
        { month: "Oct", submitted: 36, resolved: 25, escalated: 3 },
        { month: "Nov", submitted: 42, resolved: 28, escalated: 5 },
        { month: "Dec", submitted: 38, resolved: 22, escalated: 4 },
      ],
      officerPerformance: [
        {
          officerName: "Kamal Perera",
          casesHandled: 78,
          casesResolved: 52,
          avgResolutionDays: 10.2,
          satisfactionRating: 4.5,
        },
        {
          officerName: "Nimal Silva",
          casesHandled: 65,
          casesResolved: 45,
          avgResolutionDays: 11.8,
          satisfactionRating: 4.2,
        },
        {
          officerName: "Sunil Fernando",
          casesHandled: 58,
          casesResolved: 38,
          avgResolutionDays: 13.5,
          satisfactionRating: 3.8,
        },
        {
          officerName: "Priya Jayawardena",
          casesHandled: 52,
          casesResolved: 35,
          avgResolutionDays: 12.1,
          satisfactionRating: 4.0,
        },
        {
          officerName: "Ruwan De Silva",
          casesHandled: 45,
          casesResolved: 30,
          avgResolutionDays: 14.0,
          satisfactionRating: 3.6,
        },
      ],
    };
    return of(data).pipe(delay(1200));
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
}
