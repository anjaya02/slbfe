import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import {
  Complaint,
  ComplaintStatus,
  ComplaintFilter,
  ComplaintNote,
  DashboardStats,
} from "../models/complaint.model";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ComplaintService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private mapComplaint(complaint: any): Complaint {
    return {
      id: complaint.id,
      referenceNo: complaint.referenceNo,
      workerName: complaint.workerName,
      workerNIC: complaint.workerNIC,
      workerPassport: complaint.workerPassport || undefined,
      workerAddress: complaint.workerAddress,
      workerContact: complaint.workerContact,
      serviceId: complaint.serviceId,
      branch: complaint.branch,
      type: complaint.type,
      status: complaint.status,
      priority: complaint.priority,
      registrationPath: complaint.registrationPath,
      description: complaint.description,
      attachments: (complaint.attachments || []).map((attachment: any) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: Number(attachment.fileSize),
        url: attachment.url,
        uploadedBy: attachment.uploadedBy,
        uploadedAt: new Date(attachment.uploadedAt),
        thumbnail: attachment.thumbnail,
      })),
      dateSubmitted: new Date(complaint.dateSubmitted),
      dateUpdated: new Date(complaint.dateUpdated),
      assignedTo: complaint.assignedTo || undefined,
      assignedToName: complaint.assignedToName || undefined,
      history: (complaint.history || []).map((historyItem: any) => ({
        id: historyItem.id,
        complaintId: historyItem.complaintId,
        action: historyItem.action,
        description: historyItem.description,
        performedBy: historyItem.performedBy,
        timestamp: new Date(historyItem.timestamp),
        previousStatus: historyItem.previousStatus,
        newStatus: historyItem.newStatus,
      })),
      notes: (complaint.notes || []).map((note: any) => ({
        id: note.id,
        complaintId: note.complaintId,
        type: note.type,
        content: note.content,
        author: note.author,
        timestamp: new Date(note.timestamp),
        isInternal: Boolean(note.isInternal),
      })),
    };
  }

  getComplaints(
    filter?: ComplaintFilter,
  ): Observable<{ data: Complaint[]; total: number }> {
    let params = new HttpParams();

    if (filter?.search) params = params.set("search", filter.search);
    if (filter?.status?.length)
      params = params.set("status", filter.status.join(","));
    if (filter?.type?.length)
      params = params.set("type", filter.type.join(","));
    if (filter?.dateFrom)
      params = params.set("dateFrom", filter.dateFrom.toISOString());
    if (filter?.dateTo)
      params = params.set("dateTo", filter.dateTo.toISOString());
    if (filter?.assignedTo) params = params.set("assignedTo", filter.assignedTo);
    params = params.set("page", String(filter?.page ?? 0));
    params = params.set("pageSize", String(filter?.pageSize ?? 10));
    if (filter?.sortBy) params = params.set("sortBy", filter.sortBy);
    if (filter?.sortDirection)
      params = params.set("sortDirection", filter.sortDirection);

    return this.http
      .get<{ data: any[]; total: number }>(`${this.apiBaseUrl}/complaints`, {
        params,
      })
      .pipe(
        map((response) => ({
          data: response.data.map((complaint) => this.mapComplaint(complaint)),
          total: Number(response.total || 0),
        })),
      );
  }

  getComplaintById(id: string): Observable<Complaint | undefined> {
    return this.http
      .get<any>(`${this.apiBaseUrl}/complaints/${id}`)
      .pipe(map((complaint) => this.mapComplaint(complaint)));
  }

  updateComplaintStatus(
    id: string,
    newStatus: ComplaintStatus,
    note?: string,
  ): Observable<Complaint> {
    return this.http
      .patch<any>(`${this.apiBaseUrl}/complaints/${id}/status`, {
        newStatus,
        note,
      })
      .pipe(map((complaint) => this.mapComplaint(complaint)));
  }

  assignComplaint(
    complaintId: string,
    officerId: string,
    note?: string,
  ): Observable<Complaint> {
    return this.http
      .patch<any>(`${this.apiBaseUrl}/complaints/${complaintId}/assignment`, {
        officerId,
        note,
      })
      .pipe(map((complaint) => this.mapComplaint(complaint)));
  }

  addNote(
    complaintId: string,
    content: string,
    isInternal: boolean,
  ): Observable<ComplaintNote> {
    return this.http
      .post<any>(`${this.apiBaseUrl}/complaints/${complaintId}/notes`, {
        content,
        isInternal,
      })
      .pipe(
        map((note) => ({
          id: note.id,
          complaintId: note.complaintId,
          type: note.type,
          content: note.content,
          author: note.author,
          timestamp: new Date(note.timestamp),
          isInternal: Boolean(note.isInternal),
        })),
      );
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http
      .get<DashboardStats>(`${this.apiBaseUrl}/dashboard/stats`)
      .pipe(
        map((stats) => ({
          scope: stats.scope || "GLOBAL",
          totalCases: Number(stats.totalCases || 0),
          resolvedCases: Number(stats.resolvedCases || 0),
          pendingReview: Number(stats.pendingReview || 0),
          weeklyData: stats.weeklyData || [],
          monthlyData: stats.monthlyData || [],
        })),
      );
  }
}
