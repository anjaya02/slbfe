const { query, withTransaction } = require("../config/db");

const STATUS_VALUES = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Awaiting Info",
  "Resolved",
  "Closed",
];

function mapComplaintRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    referenceNo: row.reference_no,
    workerName: row.worker_name,
    workerNIC: row.worker_nic,
    workerPassport: row.worker_passport,
    workerAddress: row.worker_address,
    workerContact: row.worker_contact,
    serviceId: row.service_id,
    branch: row.branch,
    type: row.complaint_type,
    status: row.status,
    priority: row.priority,
    registrationPath: row.registration_path,
    description: row.description,
    assignedTo: row.assigned_to_user_id,
    assignedToName: row.assigned_to_name || null,
    dateSubmitted: row.date_submitted,
    dateUpdated: row.date_updated,
  };
}

function buildInClause(column, values, prefix, params) {
  const placeholders = values.map((value, index) => {
    const key = `${prefix}${index}`;
    params[key] = value;
    return `:${key}`;
  });

  return `${column} IN (${placeholders.join(", ")})`;
}

async function listComplaints(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.search) {
    clauses.push("(c.worker_name LIKE :search OR c.reference_no LIKE :search)");
    params.search = `%${filters.search}%`;
  }

  if (filters.statuses && filters.statuses.length) {
    clauses.push(buildInClause("c.status", filters.statuses, "status", params));
  }

  if (filters.types && filters.types.length) {
    clauses.push(
      buildInClause("c.complaint_type", filters.types, "type", params),
    );
  }

  if (filters.dateFrom) {
    clauses.push("c.date_submitted >= :dateFrom");
    params.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo) {
    clauses.push("c.date_submitted <= :dateTo");
    params.dateTo = filters.dateTo;
  }

  if (filters.assignedTo) {
    clauses.push("c.assigned_to_user_id = :assignedTo");
    params.assignedTo = filters.assignedTo;
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sortMap = {
    workerName: "c.worker_name",
    referenceNo: "c.reference_no",
    dateSubmitted: "c.date_submitted",
    dateUpdated: "c.date_updated",
    status: "c.status",
  };
  const sortBy = sortMap[filters.sortBy] || "c.date_submitted";
  const sortDirection = filters.sortDirection === "asc" ? "ASC" : "DESC";
  const page = Math.max(0, Number(filters.page || 0));
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize || 10)));
  const offset = page * pageSize;
  const countParams = { ...params };

  const countRows = await query(
    `
      SELECT COUNT(*) AS total
      FROM complaints c
      ${whereClause}
    `,
    countParams,
  );

  const rows = await query(
    `
      SELECT
        c.*,
        u.name AS assigned_to_name
      FROM complaints c
      LEFT JOIN users u ON u.id = c.assigned_to_user_id
      ${whereClause}
      ORDER BY ${sortBy} ${sortDirection}
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    params,
  );

  return {
    data: rows.map(mapComplaintRow),
    total: Number(countRows[0]?.total || 0),
  };
}

async function findComplaintById(id) {
  const complaintRows = await query(
    `
      SELECT
        c.*,
        u.name AS assigned_to_name
      FROM complaints c
      LEFT JOIN users u ON u.id = c.assigned_to_user_id
      WHERE c.id = :id
      LIMIT 1
    `,
    { id },
  );

  const complaint = mapComplaintRow(complaintRows[0]);

  if (!complaint) {
    return null;
  }

  const [attachments, history, notes] = await Promise.all([
    query(
      `
        SELECT
          id,
          complaint_id,
          file_name,
          file_type,
          file_size,
          storage_url,
          uploaded_by_name,
          uploaded_at
        FROM complaint_attachments
        WHERE complaint_id = :id
        ORDER BY uploaded_at DESC
      `,
      { id },
    ),
    query(
      `
        SELECT
          id,
          complaint_id,
          action,
          description,
          performed_by_name,
          event_timestamp,
          previous_status,
          new_status
        FROM complaint_history
        WHERE complaint_id = :id
        ORDER BY event_timestamp DESC
      `,
      { id },
    ),
    query(
      `
        SELECT
          id,
          complaint_id,
          note_type,
          content,
          author_name,
          created_at,
          is_internal
        FROM complaint_notes
        WHERE complaint_id = :id
        ORDER BY created_at DESC
      `,
      { id },
    ),
  ]);

  complaint.attachments = attachments.map((row) => ({
    id: row.id,
    complaintId: row.complaint_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    url: row.storage_url,
    uploadedBy: row.uploaded_by_name,
    uploadedAt: row.uploaded_at,
  }));

  complaint.history = history.map((row) => ({
    id: row.id,
    complaintId: row.complaint_id,
    action: row.action,
    description: row.description,
    performedBy: row.performed_by_name,
    timestamp: row.event_timestamp,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
  }));

  complaint.notes = notes.map((row) => ({
    id: row.id,
    complaintId: row.complaint_id,
    type: row.note_type,
    content: row.content,
    author: row.author_name,
    timestamp: row.created_at,
    isInternal: Boolean(row.is_internal),
  }));

  return complaint;
}

async function updateComplaintStatus({
  complaintId,
  newStatus,
  note,
  actor,
  historyId,
}) {
  await withTransaction(async (connection) => {
    const [complaintRows] = await connection.execute(
      `
        SELECT id, status
        FROM complaints
        WHERE id = ?
        LIMIT 1
      `,
      [complaintId],
    );

    const complaint = complaintRows[0];

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    await connection.execute(
      `
        UPDATE complaints
        SET status = ?, date_updated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [newStatus, complaintId],
    );

    await connection.execute(
      `
        INSERT INTO complaint_history (
          id,
          complaint_id,
          action,
          description,
          performed_by_user_id,
          performed_by_name,
          previous_status,
          new_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        historyId,
        complaintId,
        `Status Changed: ${newStatus}`,
        note || `Status updated to ${newStatus}`,
        actor.id,
        actor.name,
        complaint.status,
        newStatus,
      ],
    );
  });

  return findComplaintById(complaintId);
}

async function assignComplaint({
  complaintId,
  officerId,
  officerName,
  note,
  actor,
  historyId,
}) {
  await withTransaction(async (connection) => {
    const [complaintRows] = await connection.execute(
      `
        SELECT id, status
        FROM complaints
        WHERE id = ?
        LIMIT 1
      `,
      [complaintId],
    );

    const complaint = complaintRows[0];

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    await connection.execute(
      `
        UPDATE complaints
        SET assigned_to_user_id = ?, status = 'Under Review', date_updated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [officerId, complaintId],
    );

    await connection.execute(
      `
        INSERT INTO complaint_history (
          id,
          complaint_id,
          action,
          description,
          performed_by_user_id,
          performed_by_name,
          previous_status,
          new_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        historyId,
        complaintId,
        `Assigned to ${officerName}`,
        note || `Case assigned to ${officerName}, status moved to Under Review`,
        actor.id,
        actor.name,
        complaint.status,
        "Under Review",
      ],
    );
  });

  return findComplaintById(complaintId);
}

async function addNote({ noteId, complaintId, content, isInternal, actor }) {
  await query(
    `
      INSERT INTO complaint_notes (
        id,
        complaint_id,
        note_type,
        content,
        author_user_id,
        author_name,
        is_internal,
        updated_at
      ) VALUES (
        :id,
        :complaintId,
        :noteType,
        :content,
        :authorUserId,
        :authorName,
        :isInternal,
        CURRENT_TIMESTAMP
      )
    `,
    {
      id: noteId,
      complaintId,
      noteType: isInternal ? "INTERNAL_NOTE" : "WORKER_UPDATE",
      content,
      authorUserId: actor.id,
      authorName: actor.name,
      isInternal: Number(isInternal),
    },
  );

  const rows = await query(
    `
      SELECT
        id,
        complaint_id,
        note_type,
        content,
        author_name,
        created_at,
        is_internal
      FROM complaint_notes
      WHERE id = :id
      LIMIT 1
    `,
    { id: noteId },
  );

  const row = rows[0];
  return {
    id: row.id,
    complaintId: row.complaint_id,
    type: row.note_type,
    content: row.content,
    author: row.author_name,
    timestamp: row.created_at,
    isInternal: Boolean(row.is_internal),
  };
}

async function getDashboardCounts() {
  const rows = await query(
    `
      SELECT
        COUNT(*) AS total_cases,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS resolved_cases,
        SUM(CASE WHEN status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS open_cases
      FROM complaints
    `,
  );

  return rows[0] || { total_cases: 0, resolved_cases: 0, open_cases: 0 };
}

async function getDashboardCountsForOfficer(officerId) {
  const rows = await query(
    `
      SELECT
        COUNT(*) AS total_cases,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS resolved_cases,
        SUM(CASE WHEN status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS open_cases
      FROM complaints
      WHERE assigned_to_user_id = :officerId
    `,
    { officerId },
  );

  return rows[0] || { total_cases: 0, resolved_cases: 0, open_cases: 0 };
}

async function getWeeklyComplaintStats() {
  return query(
    `
      SELECT
        DATE(date_submitted) AS stat_date,
        SUM(1) AS submitted,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS pending
      FROM complaints
      WHERE date_submitted >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(date_submitted)
      ORDER BY DATE(date_submitted) ASC
    `,
  );
}

async function getWeeklyComplaintStatsForOfficer(officerId) {
  return query(
    `
      SELECT
        DATE(date_submitted) AS stat_date,
        SUM(1) AS submitted,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS pending
      FROM complaints
      WHERE assigned_to_user_id = :officerId
        AND date_submitted >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(date_submitted)
      ORDER BY DATE(date_submitted) ASC
    `,
    { officerId },
  );
}

async function getMonthlyComplaintStats() {
  return query(
    `
      SELECT
        DATE_FORMAT(date_submitted, '%Y-%m') AS stat_month,
        COUNT(*) AS count
      FROM complaints
      WHERE date_submitted >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
      GROUP BY DATE_FORMAT(date_submitted, '%Y-%m')
      ORDER BY stat_month ASC
    `,
  );
}

async function getMonthlyComplaintStatsForOfficer(officerId) {
  return query(
    `
      SELECT
        DATE_FORMAT(date_submitted, '%Y-%m') AS stat_month,
        COUNT(*) AS count
      FROM complaints
      WHERE assigned_to_user_id = :officerId
        AND date_submitted >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
      GROUP BY DATE_FORMAT(date_submitted, '%Y-%m')
      ORDER BY stat_month ASC
    `,
    { officerId },
  );
}

async function findComplaintsForReport(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.dateFrom) {
    clauses.push("c.date_submitted >= :dateFrom");
    params.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo) {
    clauses.push("c.date_submitted <= :dateTo");
    params.dateTo = filters.dateTo;
  }

  if (filters.statuses && filters.statuses.length) {
    clauses.push(
      buildInClause("c.status", filters.statuses, "reportStatus", params),
    );
  }

  if (filters.types && filters.types.length) {
    clauses.push(
      buildInClause("c.complaint_type", filters.types, "reportType", params),
    );
  }

  if (filters.branch) {
    clauses.push("c.branch = :branch");
    params.branch = filters.branch;
  }

  if (filters.officerId) {
    clauses.push("c.assigned_to_user_id = :officerId");
    params.officerId = filters.officerId;
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  return query(
    `
      SELECT
        c.id,
        c.reference_no,
        c.complaint_type,
        c.status,
        c.branch,
        c.assigned_to_user_id,
        c.date_submitted,
        c.date_updated,
        COALESCE(
          (
            SELECT MAX(ch.event_timestamp)
            FROM complaint_history ch
            WHERE ch.complaint_id = c.id
              AND ch.new_status IN ('Resolved', 'Closed')
          ),
          CASE
            WHEN c.status IN ('Resolved', 'Closed') THEN c.date_updated
            ELSE NULL
          END
        ) AS resolved_at,
        u.name AS assigned_to_name
      FROM complaints c
      LEFT JOIN users u ON u.id = c.assigned_to_user_id
      ${whereClause}
      ORDER BY c.date_submitted ASC
    `,
    params,
  );
}

module.exports = {
  STATUS_VALUES,
  listComplaints,
  findComplaintById,
  updateComplaintStatus,
  assignComplaint,
  addNote,
  getDashboardCounts,
  getDashboardCountsForOfficer,
  getWeeklyComplaintStats,
  getWeeklyComplaintStatsForOfficer,
  getMonthlyComplaintStats,
  getMonthlyComplaintStatsForOfficer,
  findComplaintsForReport,
};
