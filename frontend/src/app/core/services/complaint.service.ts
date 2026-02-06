import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of } from "rxjs";
import { delay, map } from "rxjs/operators";
import {
  Complaint,
  ComplaintStatus,
  ComplaintType,
  ComplaintFilter,
  ComplaintNote,
  CaseHistory,
  DashboardStats,
  WeeklyData,
  MonthlyData,
  Attachment,
} from "../models/complaint.model";

const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: "C001",
    referenceNo: "R10001",
    workerName: "H G R R Thusitha Perera",
    workerNIC: "199512345678",
    workerPassport: "N1234567",
    workerAddress: "Worker Camp Block B, Unit 4, Colombo",
    workerContact: "0987654321",
    serviceId: "099-1234",
    branch: "Colombo",
    type: "SALARY_ISSUES",
    status: ComplaintStatus.INVESTIGATION,
    priority: "HIGH",
    description:
      "The worker reported that they have not received their salary for the past 3 months (July, August, September 2023). Furthermore, the employer has confiscated the passport and is refusing to provide an exit permit despite the contract period having ended. The worker also claims that overtime hours are mandatory but unpaid.",
    attachments: [
      {
        id: "A1",
        fileName: "contract.pdf",
        fileType: "application/pdf",
        fileSize: 1024000,
        url: "",
        uploadedBy: "Worker",
        uploadedAt: new Date("2024-10-12"),
      },
      {
        id: "A2",
        fileName: "evidence_photo.jpg",
        fileType: "image/jpeg",
        fileSize: 512000,
        url: "",
        uploadedBy: "Worker",
        uploadedAt: new Date("2024-10-12"),
      },
    ],
    dateSubmitted: new Date("2024-10-12"),
    dateUpdated: new Date("2024-10-15"),
    assignedTo: "USR002",
    history: [
      {
        id: "H1",
        complaintId: "C001",
        action: "Status Changed: Investigation",
        description:
          "Case moved from 'Under Review' to 'Investigation' after initial documentation verification.",
        performedBy: "Iman Fernando",
        timestamp: new Date(),
        previousStatus: ComplaintStatus.UNDER_REVIEW,
        newStatus: ComplaintStatus.INVESTIGATION,
      },
      {
        id: "H2",
        complaintId: "C001",
        action: "Agency Inquiry Sent",
        description:
          "Official notice dispatched to Lanka Manpower Solutions regarding salary non-payment",
        performedBy: "Iman Fernando",
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: "H3",
        complaintId: "C001",
        action: "Case Submitted",
        description: "Initial grievance reported via the SLBFE online portal.",
        performedBy: "System",
        timestamp: new Date("2024-10-12T11:00:00"),
      },
    ],
    notes: [
      {
        id: "N1",
        complaintId: "C001",
        type: "WORKER_UPDATE",
        content:
          "The camp manager came again today and threatened us to keep quiet about the embassy officials visit. My phone's data is running out, so it might be hard to reach me later today.",
        author: "H G R Thusitha Perera (Worker)",
        timestamp: new Date(Date.now() - 3600000),
        isInternal: false,
      },
      {
        id: "N2",
        complaintId: "C001",
        type: "WORKER_UPDATE",
        content:
          "I have photos of the attendance sheets for the last month. They clearly show I worked 12 hours every day, but I have not been paid any overtime. Can I send these via WhatsApp?",
        author: "H G R Thusitha Perera (Worker)",
        timestamp: new Date(Date.now() - 7200000),
        isInternal: false,
      },
    ],
  },
  {
    id: "C002",
    referenceNo: "R0023",
    workerName: "Aman Bey",
    workerNIC: "198876543210",
    workerAddress: "Block C, Worker Housing, Riyadh",
    workerContact: "0912345678",
    serviceId: "088-5678",
    branch: "Riyadh",
    type: "LEAVE_ISSUES",
    status: ComplaintStatus.UNDER_REVIEW,
    priority: "MEDIUM",
    description:
      "Worker has not been granted annual leave for 2 consecutive years despite contractual entitlement.",
    attachments: [],
    dateSubmitted: new Date("2024-04-22"),
    dateUpdated: new Date("2024-04-23"),
    assignedTo: "USR002",
    history: [
      {
        id: "H4",
        complaintId: "C002",
        action: "Under Review",
        description: "Case assigned for initial review.",
        performedBy: "System",
        timestamp: new Date("2024-04-22"),
      },
    ],
    notes: [],
  },
  {
    id: "C003",
    referenceNo: "R1000",
    workerName: "Feven Tesfaye",
    workerNIC: "200012345678",
    workerAddress: "Camp 12, Doha",
    workerContact: "0923456789",
    serviceId: "077-9012",
    branch: "Doha",
    type: "OTHER",
    status: ComplaintStatus.IN_PROGRESS,
    priority: "LOW",
    description:
      "General complaint regarding living conditions at worker accommodation.",
    attachments: [],
    dateSubmitted: new Date("2024-04-22"),
    dateUpdated: new Date("2024-04-25"),
    assignedTo: "USR002",
    history: [],
    notes: [],
  },
  {
    id: "C004",
    referenceNo: "R5200",
    workerName: "Yanet Tesfaye",
    workerNIC: "199312345678",
    workerAddress: "Zone 3, Industrial Area, Dubai",
    workerContact: "0934567890",
    serviceId: "066-3456",
    branch: "Dubai",
    type: "WORK_ENVIRONMENT",
    status: ComplaintStatus.RESOLVED,
    priority: "MEDIUM",
    description:
      "Unsafe working conditions reported including lack of safety equipment.",
    attachments: [],
    dateSubmitted: new Date("2024-04-22"),
    dateUpdated: new Date("2024-05-10"),
    assignedTo: "USR002",
    history: [],
    notes: [],
  },
  {
    id: "C005",
    referenceNo: "R10025",
    workerName: "Beti Woloe",
    workerNIC: "199612345678",
    workerAddress: "Building 5, Muscat",
    workerContact: "0945678901",
    serviceId: "055-7890",
    branch: "Muscat",
    type: "OTHER",
    status: ComplaintStatus.UNDER_REVIEW,
    priority: "LOW",
    description: "Request for contract translation and verification.",
    attachments: [],
    dateSubmitted: new Date("2024-04-22"),
    dateUpdated: new Date("2024-04-22"),
    assignedTo: "USR002",
    history: [],
    notes: [],
  },
  {
    id: "C006",
    referenceNo: "R1200",
    workerName: "Dawit Int",
    workerNIC: "198512345678",
    workerAddress: "Worker Quarters, Kuwait City",
    workerContact: "0956789012",
    serviceId: "044-1234",
    branch: "Kuwait City",
    type: "LEAVE_ISSUES",
    status: ComplaintStatus.IN_PROGRESS,
    priority: "HIGH",
    description:
      "Employer refusing to allow worker to travel home for family emergency.",
    attachments: [],
    dateSubmitted: new Date("2024-04-22"),
    dateUpdated: new Date("2024-04-28"),
    assignedTo: "USR002",
    history: [],
    notes: [],
  },
  {
    id: "C007",
    referenceNo: "R2002",
    workerName: "Gelila Oges",
    workerNIC: "199812345678",
    workerAddress: "Accommodation Block A, Jeddah",
    workerContact: "0967890123",
    serviceId: "033-5678",
    branch: "Jeddah",
    type: "SUPERVISOR_ISSUES",
    status: ComplaintStatus.IN_PROGRESS,
    priority: "MEDIUM",
    description:
      "Worker reports verbal abuse and threats from direct supervisor.",
    attachments: [],
    dateSubmitted: new Date("2024-04-22"),
    dateUpdated: new Date("2024-04-30"),
    assignedTo: "USR002",
    history: [],
    notes: [],
  },
];

@Injectable({ providedIn: "root" })
export class ComplaintService {
  private complaintsSubject = new BehaviorSubject<Complaint[]>(MOCK_COMPLAINTS);
  public complaints$ = this.complaintsSubject.asObservable();

  getComplaints(
    filter?: ComplaintFilter,
  ): Observable<{ data: Complaint[]; total: number }> {
    return this.complaints$.pipe(
      delay(600),
      map((complaints) => {
        let filtered = [...complaints];
        if (filter?.search) {
          const s = filter.search.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.workerName.toLowerCase().includes(s) ||
              c.referenceNo.toLowerCase().includes(s),
          );
        }
        if (filter?.status?.length) {
          filtered = filtered.filter((c) => filter.status!.includes(c.status));
        }
        if (filter?.type?.length) {
          filtered = filtered.filter((c) => filter.type!.includes(c.type));
        }
        const total = filtered.length;
        const page = filter?.page ?? 0;
        const size = filter?.pageSize ?? 10;
        filtered = filtered.slice(page * size, (page + 1) * size);
        return { data: filtered, total };
      }),
    );
  }

  getComplaintById(id: string): Observable<Complaint | undefined> {
    return this.complaints$.pipe(
      delay(400),
      map((list) => list.find((c) => c.id === id)),
    );
  }

  updateComplaintStatus(
    id: string,
    newStatus: ComplaintStatus,
    note?: string,
  ): Observable<Complaint> {
    const list = this.complaintsSubject.value;
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Complaint not found");
    const updated = {
      ...list[idx],
      status: newStatus,
      dateUpdated: new Date(),
    };
    updated.history = [
      {
        id: "H" + Date.now(),
        complaintId: id,
        action: `Status Changed: ${newStatus}`,
        description: note || `Status updated to ${newStatus}`,
        performedBy: "Current User",
        timestamp: new Date(),
        previousStatus: list[idx].status,
        newStatus,
      },
      ...updated.history,
    ];
    list[idx] = updated;
    this.complaintsSubject.next([...list]);
    return of(updated).pipe(delay(500));
  }

  addNote(
    complaintId: string,
    content: string,
    isInternal: boolean,
  ): Observable<ComplaintNote> {
    const note: ComplaintNote = {
      id: "N" + Date.now(),
      complaintId,
      type: isInternal ? "INTERNAL_NOTE" : "WORKER_UPDATE",
      content,
      author: "Current User",
      timestamp: new Date(),
      isInternal,
    };
    const list = this.complaintsSubject.value;
    const idx = list.findIndex((c) => c.id === complaintId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], notes: [...list[idx].notes, note] };
      this.complaintsSubject.next([...list]);
    }
    return of(note).pipe(delay(400));
  }

  getDashboardStats(): Observable<DashboardStats> {
    const stats: DashboardStats = {
      totalCases: 125,
      resolvedCases: 45,
      pendingReview: 8,
      weeklyData: [
        { day: "Mon", submitted: 12000, resolved: 8000, pending: 4000 },
        { day: "Tue", submitted: 15000, resolved: 10000, pending: 5000 },
        { day: "Wed", submitted: 28000, resolved: 18000, pending: 10000 },
        { day: "Thur", submitted: 22000, resolved: 15000, pending: 7000 },
        { day: "Fri", submitted: 35000, resolved: 25000, pending: 10000 },
        { day: "Sat", submitted: 18000, resolved: 14000, pending: 4000 },
      ],
      monthlyData: [
        { month: "Jan", count: 320 },
        { month: "Feb", count: 280 },
        { month: "Mar", count: 350 },
        { month: "Apr", count: 410 },
        { month: "May", count: 390 },
        { month: "Jun", count: 450 },
        { month: "Jul", count: 420 },
        { month: "Aug", count: 380 },
        { month: "Sep", count: 350 },
        { month: "Oct", count: 310 },
        { month: "Nov", count: 370 },
        { month: "Dec", count: 350 },
      ],
    };
    return of(stats).pipe(delay(800));
  }
}
