const complaintRepository = require("../repositories/complaint.repository");
const userRepository = require("../repositories/user.repository");
const notificationService = require("./notification.service");
const AppError = require("../utils/app-error");
const { generateId } = require("../utils/id");
const { writeComplaintLog } = require("../utils/activity-logger");

// NOTE: Application mode configuration
// Set to "CONSULAR" for the Consular Affairs Division deployment.
// Set to "SLBFE" for the SLBFE Division deployment.
const APPLICATION_PATH = "SLBFE";

// Returns the active filter based on the configured APPLICATION_PATH.
function getPathFilters() {
  return {
    consularPathOnly: APPLICATION_PATH === "CONSULAR",
    slbfePathOnly: APPLICATION_PATH === "SLBFE",
  };
}

const TYPE_LABELS = {
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
  SOS: "SOS",
  OTHER: "Other",
};

const RESOLVED_STATUSES = new Set(["Resolved", "Closed"]);
const NOTE_PREVIEW_LENGTH = 160;
const SUBMITTED_STATUS = "Submitted";
const UNDER_REVIEW_STATUS = "Under Review";
const IN_PROGRESS_STATUS = "In Progress";
const AWAITING_INFO_STATUS = "Awaiting Info";
const RESOLVED_STATUS = "Resolved";
const CLOSED_STATUS = "Closed";
const ALLOWED_STATUS_TRANSITIONS = {
  [SUBMITTED_STATUS]: new Set([UNDER_REVIEW_STATUS]),
  [UNDER_REVIEW_STATUS]: new Set([
    IN_PROGRESS_STATUS,
    AWAITING_INFO_STATUS,
    RESOLVED_STATUS,
    CLOSED_STATUS,
  ]),
  [IN_PROGRESS_STATUS]: new Set([
    AWAITING_INFO_STATUS,
    RESOLVED_STATUS,
    CLOSED_STATUS,
  ]),
  [AWAITING_INFO_STATUS]: new Set([IN_PROGRESS_STATUS, RESOLVED_STATUS, CLOSED_STATUS]),
  [RESOLVED_STATUS]: new Set([CLOSED_STATUS]),
  [CLOSED_STATUS]: new Set(),
};

function isResolvedComplaint(complaint) {
  return RESOLVED_STATUSES.has(complaint.status);
}

function getResolutionDays(complaint) {
  if (!isResolvedComplaint(complaint) || !complaint.resolved_at) {
    return 0;
  }

  const submittedAt = new Date(complaint.date_submitted).getTime();
  const resolvedAt = new Date(complaint.resolved_at).getTime();

  return Math.max(1, (resolvedAt - submittedAt) / (1000 * 60 * 60 * 24));
}

function getNotePreview(note) {
  const normalized = note?.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= NOTE_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, NOTE_PREVIEW_LENGTH)}...`;
}

function getActorFields(actor) {
  return {
    actorId: actor?.id,
    actorName: actor?.name,
    actorRole: actor?.role,
  };
}

function getActorAuditFields(actor) {
  return {
    actorUserId: actor?.id,
    actorName: actor?.name || actor?.id || "System",
    actorRole: actor?.role,
  };
}

async function getAuthorizedComplaint(complaintId, actor, actionPrefix) {
  const complaint = await complaintRepository.findComplaintById(complaintId);

  if (!complaint) {
    writeComplaintLog(`${actionPrefix}_NOT_FOUND`, {
      ...getActorFields(actor),
      complaintId,
    });
    throw new AppError(404, "Complaint not found");
  }

  if (actor?.role === "CASE_OFFICER" && complaint.assignedTo !== actor.id) {
    writeComplaintLog(`${actionPrefix}_DENIED`, {
      ...getActorFields(actor),
      complaintId,
      referenceNo: complaint.referenceNo,
      assignedTo: complaint.assignedTo,
    });
    throw new AppError(
      403,
      "You do not have permission to access this complaint",
    );
  }

  return complaint;
}

async function getComplaints(filters) {
  const effectiveFilters = {
    ...filters,
    ...getPathFilters(),
    assignedTo:
      filters.actor?.role === "CASE_OFFICER"
        ? filters.actor.id
        : filters.assignedTo,
  };

  const response = await complaintRepository.listComplaints(effectiveFilters);

  writeComplaintLog("COMPLAINT_LIST_RETURNED", {
    ...getActorFields(filters.actor),
    search: filters.search,
    statuses: filters.statuses?.join(","),
    types: filters.types?.join(","),
    assignedTo: effectiveFilters.assignedTo,
    page: filters.page,
    pageSize: filters.pageSize,
    returnedCount: response.data?.length || 0,
    totalCount: response.total || 0,
  });

  return response;
}

async function getComplaintCountries(actor) {
  return complaintRepository.listComplaintCountries({
    ...getPathFilters(),
    assignedTo: actor?.role === "CASE_OFFICER" ? actor.id : undefined,
  });
}

async function getComplaintById(complaintId, actor) {
  let complaint = await getAuthorizedComplaint(
    complaintId,
    actor,
    "COMPLAINT_VIEW",
  );

  if (shouldAcknowledgeReviewOnOpen(complaint, actor)) {
    complaint = await acknowledgeComplaintReview({ complaint, actor });
  }

  writeComplaintLog("COMPLAINT_VIEWED", {
    ...getActorFields(actor),
    complaintId: complaint.id,
    referenceNo: complaint.referenceNo,
    status: complaint.status,
    assignedTo: complaint.assignedTo,
  });

  return complaint;
}

function shouldAcknowledgeReviewOnOpen(complaint, actor) {
  return (
    complaint.status === SUBMITTED_STATUS &&
    complaint.assignedTo &&
    (actor?.role === "SUPERVISOR" || complaint.assignedTo === actor?.id)
  );
}

async function acknowledgeComplaintReview({ complaint, actor }) {
  const updatedComplaint = await complaintRepository.updateComplaintStatus({
    complaintId: complaint.id,
    newStatus: UNDER_REVIEW_STATUS,
    actor,
    auditEvent: {
      id: generateId("AUD"),
      complaintId: complaint.id,
      eventType: "STATUS_CHANGED",
      ...getActorAuditFields(actor),
      previousStatus: complaint.status,
      newStatus: UNDER_REVIEW_STATUS,
      metadata: {
        automatic: true,
        trigger: "OPEN_ASSIGNED_COMPLAINT",
      },
    },
  });

  writeComplaintLog("COMPLAINT_REVIEW_ACKNOWLEDGED", {
    ...getActorFields(actor),
    complaintId: complaint.id,
    referenceNo: complaint.referenceNo,
    previousStatus: complaint.status,
    newStatus: UNDER_REVIEW_STATUS,
    assignedTo: complaint.assignedTo,
  });

  return updatedComplaint || complaint;
}

async function updateComplaintStatus({ complaintId, newStatus, note, actor }) {
  if (!complaintRepository.STATUS_VALUES.includes(newStatus)) {
    writeComplaintLog("COMPLAINT_STATUS_UPDATE_REJECTED", {
      ...getActorFields(actor),
      complaintId,
      attemptedStatus: newStatus,
      reason: "Invalid complaint status",
    });
    throw new AppError(400, "Invalid complaint status");
  }

  const existingComplaint = await getAuthorizedComplaint(
    complaintId,
    actor,
    "COMPLAINT_STATUS_UPDATE",
  );

  validateStatusTransition(existingComplaint, newStatus, actor);

  if (existingComplaint.status === newStatus) {
    return existingComplaint;
  }

  const updatedComplaint = await complaintRepository.updateComplaintStatus({
    complaintId,
    newStatus,
    note,
    actor,
    auditEvent: {
      id: generateId("AUD"),
      complaintId,
      eventType: "STATUS_CHANGED",
      ...getActorAuditFields(actor),
      previousStatus: existingComplaint.status,
      newStatus,
      metadata: {
        noteAdded: Boolean(note?.trim()),
      },
    },
  });

  if (!updatedComplaint) {
    throw new AppError(404, "Complaint not found");
  }

  const eventName =
    updatedComplaint.status === "Closed"
      ? "COMPLAINT_CLOSED"
      : "COMPLAINT_STATUS_UPDATED";

  writeComplaintLog(eventName, {
    ...getActorFields(actor),
    complaintId: updatedComplaint.id,
    referenceNo: updatedComplaint.referenceNo,
    previousStatus: existingComplaint.status,
    newStatus: updatedComplaint.status,
    assignedTo: updatedComplaint.assignedTo,
    noteAdded: Boolean(note?.trim()),
    notePreview: getNotePreview(note),
  });

  if (updatedComplaint.assignedTo) {
    await notificationService.createStatusNotification({
      recipientUserId: updatedComplaint.assignedTo,
      complaintId: updatedComplaint.id,
      referenceNo: updatedComplaint.referenceNo,
      status: updatedComplaint.status,
    });
  }

  return updatedComplaint;
}

async function assignComplaint({ complaintId, officerId, note, actor }) {
  const existingComplaint = await getAuthorizedComplaint(
    complaintId,
    actor,
    "COMPLAINT_ASSIGNMENT",
  );

  const officerRow = await userRepository.findById(officerId);

  if (
    !officerRow ||
    officerRow.role !== "CASE_OFFICER" ||
    !officerRow.is_active
  ) {
    writeComplaintLog("COMPLAINT_ASSIGNMENT_REJECTED", {
      ...getActorFields(actor),
      complaintId,
      referenceNo: existingComplaint.referenceNo,
      attemptedOfficerId: officerId,
      reason: "Selected officer is invalid or inactive",
    });
    throw new AppError(400, "Selected officer is invalid or inactive");
  }

  const nextStatus =
    existingComplaint.status === SUBMITTED_STATUS
      ? UNDER_REVIEW_STATUS
      : existingComplaint.status;

  const updatedComplaint = await complaintRepository.assignComplaint({
    complaintId,
    officerId,
    officerName: officerRow.name,
    nextStatus,
    note,
    actor,
    auditEvent: {
      id: generateId("AUD"),
      complaintId,
      eventType: "ASSIGNED",
      ...getActorAuditFields(actor),
      previousStatus: existingComplaint.status,
      newStatus: nextStatus,
      previousAssigneeUserId: existingComplaint.assignedTo,
      previousAssigneeName: existingComplaint.assignedToName,
      newAssigneeUserId: officerId,
      newAssigneeName: officerRow.name,
      metadata: {
        noteAdded: Boolean(note?.trim()),
      },
    },
  });

  if (!updatedComplaint) {
    throw new AppError(404, "Complaint not found");
  }

  writeComplaintLog("COMPLAINT_ASSIGNED", {
    ...getActorFields(actor),
    complaintId: updatedComplaint.id,
    referenceNo: updatedComplaint.referenceNo,
    previousOfficerId: existingComplaint.assignedTo,
    previousOfficerName: existingComplaint.assignedToName,
    newOfficerId: officerId,
    newOfficerName: officerRow.name,
    previousStatus: existingComplaint.status,
    newStatus: updatedComplaint.status,
    noteAdded: Boolean(note?.trim()),
    notePreview: getNotePreview(note),
  });

  await notificationService.createAssignmentNotification({
    recipientUserId: officerId,
    complaintId: updatedComplaint.id,
    referenceNo: updatedComplaint.referenceNo,
  });

  return updatedComplaint;
}

async function addNote({ complaintId, content, isInternal, actor }) {
  const complaint = await getAuthorizedComplaint(
    complaintId,
    actor,
    "COMPLAINT_NOTE_ADD",
  );
  const noteId = generateId("N");

  const note = await complaintRepository.addNote({
    noteId,
    complaintId,
    content,
    isInternal,
    actor,
    auditEvent: {
      id: generateId("AUD"),
      complaintId,
      eventType: "NOTE_ADDED",
      ...getActorAuditFields(actor),
      noteId,
      noteType: isInternal ? "INTERNAL_NOTE" : "WORKER_UPDATE",
      metadata: {
        contentLength: content?.length || 0,
      },
    },
  });

  writeComplaintLog("COMPLAINT_NOTE_ADDED", {
    ...getActorFields(actor),
    complaintId,
    referenceNo: complaint.referenceNo,
    noteId: note.id,
    noteType: isInternal ? "INTERNAL_NOTE" : "WORKER_UPDATE",
    contentLength: content?.length || 0,
    contentPreview: getNotePreview(content),
  });

  return note;
}

async function transferToSlbfe({ complaintId, actor }) {
  const existingComplaint = await getAuthorizedComplaint(
    complaintId,
    actor,
    "COMPLAINT_SLBFE_TRANSFER",
  );

  if (existingComplaint.registrationPath === "SLBFE") {
    return existingComplaint;
  }

  const updatedComplaint = await complaintRepository.transferToSlbfe({
    complaintId,
    actor,
    auditEvent: {
      id: generateId("AUD"),
      complaintId,
      eventType: "SLBFE_TRANSFERRED",
      ...getActorAuditFields(actor),
      metadata: {
        previousHandle: existingComplaint.registrationPath,
        newHandle: "SLBFE",
      },
    },
  });

  if (!updatedComplaint) {
    throw new AppError(404, "Complaint not found");
  }

  writeComplaintLog("COMPLAINT_SLBFE_TRANSFERRED", {
    ...getActorFields(actor),
    complaintId: updatedComplaint.id,
    referenceNo: updatedComplaint.referenceNo,
    previousHandle: existingComplaint.registrationPath,
    newHandle: updatedComplaint.registrationPath,
  });

  return updatedComplaint;
}

function validateStatusTransition(complaint, newStatus, actor) {
  const allowedStatuses = ALLOWED_STATUS_TRANSITIONS[complaint.status] || new Set();

  if (allowedStatuses.has(newStatus)) {
    return;
  }

  writeComplaintLog("COMPLAINT_STATUS_UPDATE_REJECTED", {
    ...getActorFields(actor),
    complaintId: complaint.id,
    referenceNo: complaint.referenceNo,
    currentStatus: complaint.status,
    attemptedStatus: newStatus,
    reason: "Invalid status transition",
  });

  throw new AppError(
    400,
    `Cannot move complaint from ${complaint.status} to ${newStatus}`,
  );
}

async function getDashboardStats(user) {
  const isCaseOfficer = user?.role === "CASE_OFFICER";
  const dashboardFilters = getPathFilters();

  const [summary, weeklyRows, monthlyRows] = await Promise.all(
    isCaseOfficer
      ? [
          complaintRepository.getDashboardCountsForOfficer(
            user.id,
            dashboardFilters,
          ),
          complaintRepository.getWeeklyComplaintStatsForOfficer(
            user.id,
            dashboardFilters,
          ),
          complaintRepository.getMonthlyComplaintStatsForOfficer(
            user.id,
            dashboardFilters,
          ),
        ]
      : [
          complaintRepository.getDashboardCounts(dashboardFilters),
          complaintRepository.getWeeklyComplaintStats(dashboardFilters),
          complaintRepository.getMonthlyComplaintStats(dashboardFilters),
        ],
  );

  const weeklyMap = new Map(
    weeklyRows.map((row) => [
      new Date(row.stat_date).toISOString().slice(0, 10),
      {
        submitted: Number(row.submitted || 0),
        resolved: Number(row.resolved || 0),
        pending: Number(row.pending || 0),
      },
    ]),
  );

  const weeklyData = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const bucket = weeklyMap.get(key) || {
      submitted: 0,
      resolved: 0,
      pending: 0,
    };

    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      submitted: bucket.submitted,
      resolved: bucket.resolved,
      pending: bucket.pending,
    };
  });

  const monthlyMap = new Map(
    monthlyRows.map((row) => [row.stat_month, Number(row.count || 0)]),
  );

  const monthlyData = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      count: monthlyMap.get(key) || 0,
    };
  });

  const dashboardStats = {
    scope: isCaseOfficer ? "ASSIGNED" : "GLOBAL",
    totalCases: Number(summary.total_cases || 0),
    resolvedCases: Number(summary.resolved_cases || 0),
    pendingReview: Number(summary.open_cases || 0),
    weeklyData,
    monthlyData,
  };

  writeComplaintLog("COMPLAINT_DASHBOARD_RETURNED", {
    ...getActorFields(user),
    scope: dashboardStats.scope,
    totalCases: dashboardStats.totalCases,
    resolvedCases: dashboardStats.resolvedCases,
    pendingReview: dashboardStats.pendingReview,
  });

  return dashboardStats;
}

function buildDateRange(reportType, filter) {
  const today = new Date();

  if (reportType === "CUSTOM") {
    return {
      dateFrom: filter.dateFrom ? new Date(filter.dateFrom) : undefined,
      dateTo: filter.dateTo ? new Date(filter.dateTo) : undefined,
    };
  }

  if (reportType === "MONTHLY") {
    return {
      dateFrom: new Date(today.getFullYear(), today.getMonth(), 1),
      dateTo: new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    };
  }

  if (reportType === "QUARTERLY") {
    const quarterStart = Math.floor(today.getMonth() / 3) * 3;
    return {
      dateFrom: new Date(today.getFullYear(), quarterStart, 1),
      dateTo: new Date(
        today.getFullYear(),
        quarterStart + 3,
        0,
        23,
        59,
        59,
        999,
      ),
    };
  }

  return {
    dateFrom: new Date(today.getFullYear(), 0, 1),
    dateTo: new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

function round(value) {
  return Number(value.toFixed(1));
}

async function generateReport(filter, actor) {
  const effectiveFilter = {
    ...filter,
    ...buildDateRange(filter.reportType, filter),
    ...getPathFilters(),
  };

  const complaints =
    await complaintRepository.findComplaintsForReport(effectiveFilter);
  const totalCases = complaints.length;
  const resolvedCases = complaints.filter((complaint) =>
    isResolvedComplaint(complaint),
  );
  const pendingCases = complaints.filter(
    (complaint) => !isResolvedComplaint(complaint),
  ).length;
  const averageResolutionDays = resolvedCases.length
    ? round(
        resolvedCases.reduce((sum, complaint) => {
          return sum + getResolutionDays(complaint);
        }, 0) / resolvedCases.length,
      )
    : 0;

  const statusCounts = new Map();
  const typeCounts = new Map();
  const officerBuckets = new Map();
  const monthlyBuckets = new Map();

  complaints.forEach((complaint) => {
    statusCounts.set(
      complaint.status,
      (statusCounts.get(complaint.status) || 0) + 1,
    );
    const typeLabel =
      TYPE_LABELS[complaint.complaint_type] || complaint.complaint_type;
    typeCounts.set(typeLabel, (typeCounts.get(typeLabel) || 0) + 1);

    if (complaint.assigned_to_user_id && complaint.assigned_to_name) {
      const bucket = officerBuckets.get(complaint.assigned_to_name) || [];
      bucket.push(complaint);
      officerBuckets.set(complaint.assigned_to_name, bucket);
    }

    const date = new Date(complaint.date_submitted);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthBucket = monthlyBuckets.get(monthKey) || {
      month: date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      submitted: 0,
      resolved: 0,
    };
    monthBucket.submitted += 1;
    if (isResolvedComplaint(complaint)) monthBucket.resolved += 1;
    monthlyBuckets.set(monthKey, monthBucket);
  });

  const report = {
    title: `${filter.reportType.charAt(0)}${filter.reportType.slice(1).toLowerCase()} Report`,
    generatedAt: new Date(),
    filters: effectiveFilter,
    summary: {
      totalCases,
      resolvedCases: resolvedCases.length,
      resolvedPercentage: totalCases
        ? round((resolvedCases.length / totalCases) * 100)
        : 0,
      averageResolutionDays,
      pendingCases,
    },
    statusBreakdown: Array.from(statusCounts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: totalCases ? round((count / totalCases) * 100) : 0,
      }))
      .sort((left, right) => right.count - left.count),
    typeBreakdown: Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalCases ? round((count / totalCases) * 100) : 0,
      }))
      .sort((left, right) => right.count - left.count),
    monthlyTrend: Array.from(monthlyBuckets.entries())
      .sort(([leftMonth], [rightMonth]) => leftMonth.localeCompare(rightMonth))
      .map(([, values]) => ({
        month: values.month,
        submitted: values.submitted,
        resolved: values.resolved,
      })),
    officerPerformance: Array.from(officerBuckets.entries())
      .map(([officerName, cases]) => {
        const resolved = cases.filter((complaint) =>
          isResolvedComplaint(complaint),
        );
        const avgResolutionDays = resolved.length
          ? round(
              resolved.reduce((sum, complaint) => {
                return sum + getResolutionDays(complaint);
              }, 0) / resolved.length,
            )
          : 0;

        return {
          officerName,
          casesHandled: cases.length,
          casesResolved: resolved.length,
          avgResolutionDays,
        };
      })
      .sort((left, right) => {
        if (right.casesHandled !== left.casesHandled) {
          return right.casesHandled - left.casesHandled;
        }

        return left.officerName.localeCompare(right.officerName);
      }),
  };

  writeComplaintLog("COMPLAINT_REPORT_GENERATED", {
    ...getActorFields(actor),
    reportType: filter.reportType,
    dateFrom: effectiveFilter.dateFrom?.toISOString?.() || effectiveFilter.dateFrom,
    dateTo: effectiveFilter.dateTo?.toISOString?.() || effectiveFilter.dateTo,
    totalCases,
    resolvedCases: resolvedCases.length,
    pendingCases,
  });

  return report;
}

module.exports = {
  APPLICATION_PATH,
  getComplaints,
  getComplaintCountries,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  addNote,
  transferToSlbfe,
  getDashboardStats,
  generateReport,
};
