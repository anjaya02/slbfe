export enum ComplaintStatus {
  DRAFT = "Draft",
  SUBMITTED = "Submitted",
  PENDING_VERIFICATION = "Pending Verification",
  UNDER_REVIEW = "Under Review",
  INVESTIGATION = "Investigation",
  ESCALATED = "Escalate",
  AWAITING_INFO = "Awaiting Info",
  IN_PROGRESS = "In Progress",
  RESOLVED = "Resolved",
  CLOSED = "Closed",
}

export type ComplaintType =
  | "SALARY_ISSUES"
  | "LEAVE_ISSUES"
  | "WORK_ENVIRONMENT"
  | "SUPERVISOR_ISSUES"
  | "OTHER";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RegistrationPath = "SLBFE" | "CONSULAR";

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
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface DashboardStats {
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
  SALARY_ISSUES: "Salary Issues",
  LEAVE_ISSUES: "Leave Issues",
  WORK_ENVIRONMENT: "Work Environment",
  SUPERVISOR_ISSUES: "Supervisor Issues",
  OTHER: "Other",
};

export const STATUS_STEPS = [
  ComplaintStatus.SUBMITTED,
  ComplaintStatus.UNDER_REVIEW,
  ComplaintStatus.INVESTIGATION,
  ComplaintStatus.ESCALATED,
  ComplaintStatus.RESOLVED,
];
