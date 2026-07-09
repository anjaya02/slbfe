export enum ComplaintStatus {
  SUBMITTED = "Submitted",
  UNDER_REVIEW = "Under Review",
  IN_PROGRESS = "In Progress",
  AWAITING_INFO = "Awaiting Info",
  RESOLVED = "Resolved",
  CLOSED = "Closed",
}

// Category names come from the DB, so keep this flexible.
export type ComplaintType = string;

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RegistrationPath = "SLBFE" | "CONSULAR";

export interface ComplaintProfile {
  fullName: string;
  nic: string;
  passport?: string;
  mobile: string;
  email?: string;
  workCountry?: string;
  username?: string;
}

export interface Complaint {
  id: string;
  referenceNo: string;
  workerName: string;
  workerNIC: string;
  workerPassport?: string;
  workerAddress: string;
  workerContact: string;
  serviceId: string;
  branch: string;
  type: ComplaintType;
  status: ComplaintStatus;
  priority: Priority;
  registrationPath: RegistrationPath;
  description: string;
  expectedResolution?: string;
  hasComplainantProfile: boolean;
  workerProfile: ComplaintProfile;
  complainantProfile?: ComplaintProfile;
  attachments: Attachment[];
  dateSubmitted: Date;
  dateUpdated: Date;
  assignedTo?: string;
  assignedToName?: string;
  history: CaseHistory[];
  notes: ComplaintNote[];
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  thumbnail?: string;
}

export interface CaseHistory {
  id: string;
  complaintId: string;
  action: string;
  description: string;
  performedBy: string;
  timestamp: Date;
  previousStatus?: ComplaintStatus;
  newStatus?: ComplaintStatus;
}

export interface ComplaintNote {
  id: string;
  complaintId: string;
  type: "WORKER_UPDATE" | "INTERNAL_NOTE" | "SYSTEM_LOG";
  content: string;
  author: string;
  timestamp: Date;
  isInternal: boolean;
}

export interface ComplaintFilter {
  search?: string;
  status?: ComplaintStatus[];
  type?: ComplaintType[];
  dateFrom?: Date;
  dateTo?: Date;
  assignedTo?: string;
  branch?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface DashboardStats {
  scope?: "GLOBAL" | "ASSIGNED";
  totalCases: number;
  resolvedCases: number;
  pendingReview: number;
  weeklyData: WeeklyData[];
  monthlyData: MonthlyData[];
}

export interface WeeklyData {
  day: string;
  submitted: number;
  resolved: number;
  pending: number;
}

export interface MonthlyData {
  month: string;
  count: number;
}


