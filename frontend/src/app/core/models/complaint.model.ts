export enum ComplaintStatus {
  SUBMITTED = "Submitted",
  UNDER_REVIEW = "Under Review",
  IN_PROGRESS = "In Progress",
  AWAITING_INFO = "Awaiting Info",
  RESOLVED = "Resolved",
  CLOSED = "Closed",
}

export type ComplaintType =
  | "BREACH_OF_CONTRACT"
  | "HARASSMENT"
  | "LACK_OF_COMMUNICATION"
  | "SICK"
  | "BEING_JAILED"
  | "BEING_REMANDED_BY_POLICE"
  | "BEING_STRANDED"
  | "PROBLEMS_AT_HOME"
  | "DEATH"
  | "BEING_RETAINED"
  | "OTHER";

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

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  BREACH_OF_CONTRACT: "Breach of Employment Contract",
  HARASSMENT: "Harassment",
  LACK_OF_COMMUNICATION: "Lack of Communication",
  SICK: "Sick",
  BEING_JAILED: "Being Jailed",
  BEING_REMANDED_BY_POLICE: "Being Remanded by Police",
  BEING_STRANDED: "Being Stranded without Employment",
  PROBLEMS_AT_HOME: "Problems at Employee's Home (Sri Lanka)",
  DEATH: "Death",
  BEING_RETAINED: "Being Retained by Unknown Person",
  OTHER: "Other",
};
