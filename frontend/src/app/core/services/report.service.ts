import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ReportData, ReportFilter } from "../models/report.model";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ReportService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  generateReport(filter: ReportFilter): Observable<ReportData> {
    return this.http
      .post<ReportData>(`${this.apiBaseUrl}/reports/generate`, {
        ...filter,
        dateFrom: filter.dateFrom ? filter.dateFrom.toISOString() : undefined,
        dateTo: filter.dateTo ? filter.dateTo.toISOString() : undefined,
      })
      .pipe(
        map((report) => ({
          ...report,
          generatedAt: new Date(report.generatedAt),
          filters: {
            ...report.filters,
            dateFrom: report.filters?.dateFrom
              ? new Date(report.filters.dateFrom)
              : undefined,
            dateTo: report.filters?.dateTo
              ? new Date(report.filters.dateTo)
              : undefined,
          },
        })),
      );
  }
}
