const complaintRepository = require("../repositories/complaint.repository");
const userRepository = require("../repositories/user.repository");
const notificationService = require("./notification.service");
const AppError = require("../utils/app-error");
const { generateId } = require("../utils/id");

const TYPE_LABELS = {
  BREACH_OF_CONTRACT: "Breach of Employment Contract",
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

const RESOLVED_STATUSES = new Set(["Resolved", "Closed"]);

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

async function getComplaints(filters) {
  if (filters.actor?.role === "CASE_OFFICER") {
    return complaintRepository.listComplaints({
      ...filters,
      assignedTo: filters.actor.id,
    });
  }

  return complaintRepository.listComplaints(filters);
}

async function getComplaintById(complaintId, actor) {
  const complaint = await complaintRepository.findComplaintById(complaintId);

  if (!complaint) {
    throw new AppError(404, "Complaint not found");
  }

  if (actor?.role === "CASE_OFFICER" && complaint.assignedTo !== actor.id) {
    throw new AppError(
      403,
      "You do not have permission to access this complaint",
    );
  }

  return complaint;
}

async function updateComplaintStatus({ complaintId, newStatus, note, actor }) {
  if (!complaintRepository.STATUS_VALUES.includes(newStatus)) {
    throw new AppError(400, "Invalid complaint status");
  }

  await getComplaintById(complaintId, actor);

  const updatedComplaint = await complaintRepository.updateComplaintStatus({
    complaintId,
    newStatus,
    note,
    actor,
    historyId: generateId("H"),
  });

  if (!updatedComplaint) {
    throw new AppError(404, "Complaint not found");
  }

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
  await getComplaintById(complaintId, actor);

  const officerRow = await userRepository.findById(officerId);

  if (
    !officerRow ||
    officerRow.role !== "CASE_OFFICER" ||
    !officerRow.is_active
  ) {
    throw new AppError(400, "Selected officer is invalid or inactive");
  }

  const updatedComplaint = await complaintRepository.assignComplaint({
    complaintId,
    officerId,
    officerName: officerRow.name,
    note,
    actor,
    historyId: generateId("H"),
  });

  if (!updatedComplaint) {
    throw new AppError(404, "Complaint not found");
  }

  await notificationService.createAssignmentNotification({
    recipientUserId: officerId,
    complaintId: updatedComplaint.id,
    referenceNo: updatedComplaint.referenceNo,
  });

  return updatedComplaint;
}

async function addNote({ complaintId, content, isInternal, actor }) {
  await getComplaintById(complaintId, actor);

  return complaintRepository.addNote({
    noteId: generateId("N"),
    complaintId,
    content,
    isInternal,
    actor,
  });
}

async function getDashboardStats(user) {
  const isCaseOfficer = user?.role === "CASE_OFFICER";

  const [summary, weeklyRows, monthlyRows] = await Promise.all(
    isCaseOfficer
      ? [
          complaintRepository.getDashboardCountsForOfficer(user.id),
          complaintRepository.getWeeklyComplaintStatsForOfficer(user.id),
          complaintRepository.getMonthlyComplaintStatsForOfficer(user.id),
        ]
      : [
          complaintRepository.getDashboardCounts(),
          complaintRepository.getWeeklyComplaintStats(),
          complaintRepository.getMonthlyComplaintStats(),
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

  return {
    scope: isCaseOfficer ? "ASSIGNED" : "GLOBAL",
    totalCases: Number(summary.total_cases || 0),
    resolvedCases: Number(summary.resolved_cases || 0),
    pendingReview: Number(summary.open_cases || 0),
    weeklyData,
    monthlyData,
  };
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

async function generateReport(filter) {
  const effectiveFilter = {
    ...filter,
    ...buildDateRange(filter.reportType, filter),
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

  return {
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
}

module.exports = {
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  addNote,
  getDashboardStats,
  generateReport,
};
