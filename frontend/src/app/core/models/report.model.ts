import { ComplaintStatus, ComplaintType } from "./complaint.model";

export type ReportType =
  | "SUMMARY"
  | "STATUS"
  | "TYPE"
  | "OFFICER_PERFORMANCE"
  | "TREND_ANALYSIS";

export interface ReportFilter {
  reportType: ReportType;
  dateFrom?: Date;
  dateTo?: Date;
  statuses?: ComplaintStatus[];
  types?: ComplaintType[];
  branch?: string;
  officerId?: string;
}

export interface ReportData {
  title: string;
  generatedAt: Date;
  filters: ReportFilter;
  summary: ReportSummary;
  statusBreakdown: StatusBreakdownItem[];
  typeBreakdown: TypeBreakdownItem[];
  monthlyTrend: MonthlyTrendItem[];
  officerPerformance: OfficerPerformanceItem[];
}

export interface ReportSummary {
  totalCases: number;
  resolvedCases: number;
  resolvedPercentage: number;
  averageResolutionDays: number;
  escalatedCases: number;
  pendingCases: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface TypeBreakdownItem {
  type: string;
  count: number;
  percentage: number;
}

export interface MonthlyTrendItem {
  month: string;
  submitted: number;
  resolved: number;
  escalated: number;
}

export interface OfficerPerformanceItem {
  officerName: string;
  casesHandled: number;
  casesResolved: number;
  avgResolutionDays: number;
  satisfactionRating: number;
}
