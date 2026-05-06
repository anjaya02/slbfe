const { query, withTransaction } = require("../config/db");

const STATUS_VALUES = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Awaiting Info",
  "Resolved",
  "Closed",
];

const TYPE_VALUES = [
  "BREACH_OF_CONTRACT",
  "LACK_OF_COMMUNICATION",
  "SICK",
  "BEING_JAILED",
  "BEING_REMANDED_BY_POLICE",
  "BEING_STRANDED",
  "PROBLEMS_AT_HOME",
  "DEATH",
  "BEING_RETAINED",
  "OTHER",
];

const STATUS_KEY_MAP = {
  SUBMITTED: "Submitted",
  NEW: "Submitted",
  OPEN: "Submitted",
  UNDER_REVIEW: "Under Review",
  REVIEW: "Under Review",
  REVIEWING: "Under Review",
  PENDING: "Under Review",
  IN_PROGRESS: "In Progress",
  INPROGRESS: "In Progress",
  PROGRESS: "In Progress",
  PROCESSING: "In Progress",
  AWAITING_INFO: "Awaiting Info",
  AWAITING_INFORMATION: "Awaiting Info",
  NEED_MORE_INFO: "Awaiting Info",
  RESOLVED: "Resolved",
  RESOLVE: "Resolved",
  COMPLETED: "Resolved",
  CLOSED: "Closed",
  CLOSE: "Closed",
};

const TYPE_KEY_MAP = {
  BREACH_OF_CONTRACT: "BREACH_OF_CONTRACT",
  BREACH_OF_EMPLOYMENT_CONTRACT: "BREACH_OF_CONTRACT",
  CONTRACT_BREACH: "BREACH_OF_CONTRACT",
  CONTRACT: "BREACH_OF_CONTRACT",
  LACK_OF_COMMUNICATION: "LACK_OF_COMMUNICATION",
  COMMUNICATION: "LACK_OF_COMMUNICATION",
  SICK: "SICK",
  ILLNESS: "SICK",
  BEING_JAILED: "BEING_JAILED",
  JAILED: "BEING_JAILED",
  IN_JAIL: "BEING_JAILED",
  BEING_REMANDED_BY_POLICE: "BEING_REMANDED_BY_POLICE",
  REMANDED_BY_POLICE: "BEING_REMANDED_BY_POLICE",
  POLICE_REMAND: "BEING_REMANDED_BY_POLICE",
  BEING_STRANDED: "BEING_STRANDED",
  STRANDED: "BEING_STRANDED",
  BEING_STRANDED_WITHOUT_EMPLOYMENT: "BEING_STRANDED",
  PROBLEMS_AT_HOME: "PROBLEMS_AT_HOME",
  PROBLEMS_AT_EMPLOYEES_HOME_SRI_LANKA: "PROBLEMS_AT_HOME",
  HOME_PROBLEMS: "PROBLEMS_AT_HOME",
  DEATH: "DEATH",
  BEING_RETAINED: "BEING_RETAINED",
  RETAINED: "BEING_RETAINED",
  BEING_RETAINED_BY_UNKNOWN_PERSON: "BEING_RETAINED",
  OTHER: "OTHER",
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeStatus(value) {
  const exact = STATUS_VALUES.find((status) => status === value);
  if (exact) {
    return exact;
  }

  return STATUS_KEY_MAP[normalizeKey(value)] || "Submitted";
}

function normalizeComplaintType(...values) {
  for (const value of values) {
    const exact = TYPE_VALUES.find((type) => type === value);
    if (exact) {
      return exact;
    }

    const mapped = TYPE_KEY_MAP[normalizeKey(value)];
    if (mapped) {
      return mapped;
    }
  }

  return "OTHER";
}

function statusCaseSql(column) {
  const normalizedColumn = `
    UPPER(
      REPLACE(
        REPLACE(
          REPLACE(COALESCE(${column}, ''), ' ', '_'),
          '-',
          '_'
        ),
        '/',
        '_'
      )
    )
  `;

  return `
    CASE
      WHEN ${normalizedColumn} IN ('SUBMITTED', 'NEW', 'OPEN') THEN 'Submitted'
      WHEN ${normalizedColumn} IN ('UNDER_REVIEW', 'REVIEW', 'REVIEWING', 'PENDING') THEN 'Under Review'
      WHEN ${normalizedColumn} IN ('IN_PROGRESS', 'INPROGRESS', 'PROGRESS', 'PROCESSING') THEN 'In Progress'
      WHEN ${normalizedColumn} IN ('AWAITING_INFO', 'AWAITING_INFORMATION', 'NEED_MORE_INFO') THEN 'Awaiting Info'
      WHEN ${normalizedColumn} IN ('RESOLVED', 'RESOLVE', 'COMPLETED') THEN 'Resolved'
      WHEN ${normalizedColumn} IN ('CLOSED', 'CLOSE') THEN 'Closed'
      ELSE 'Submitted'
    END
  `;
}

function truncate(value, maxLength) {
  return String(value || "").slice(0, maxLength);
}

function fallbackText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function getPriority(type, status) {
  if (type === "DEATH" || type === "BEING_RETAINED") {
    return "CRITICAL";
  }

  if (status === "Resolved" || status === "Closed") {
    return "MEDIUM";
  }

  if (type === "BREACH_OF_CONTRACT" || type === "BEING_STRANDED") {
    return "HIGH";
  }

  return "MEDIUM";
}

function getResolutionCategory(status) {
  if (status === "Resolved") {
    return "RESOLVED";
  }

  if (status === "Closed") {
    return "CLOSED";
  }

  return null;
}

function getComplaintDateExpression() {
  return "COALESCE(d.reported_time, d.updated_time)";
}

function getComplaintBaseSelect() {
  return `
    SELECT
      d.complain_id,
      d.complain_type,
      d.complain_user,
      d.behalf_user,
      d.mobile_no,
      d.passport_no,
      d.nic_no,
      d.work_country,
      d.reported_time,
      d.complain_catagory,
      cc.category_name AS complain_category_name,
      d.resolution_catagory,
      rc.category_name AS resolution_category_name,
      d.complain_status,
      ${statusCaseSql("d.complain_status")} AS normalized_status,
      d.updated_time,
      d.updated_user,
      ca.assigned_to_user_id,
      u.name AS assigned_to_name,
      (
        SELECT c.complain_msg
        FROM complain_comments c
        WHERE c.complain_id = d.complain_id
        ORDER BY COALESCE(c.updated_time, '1970-01-01') ASC
        LIMIT 1
      ) AS first_comment
    FROM complain_details d
    LEFT JOIN complain_catagory cc ON cc.category_id = d.complain_catagory
    LEFT JOIN resolution_catagory rc ON rc.category_id = d.resolution_catagory
    LEFT JOIN complaint_assignments ca ON ca.complaint_id = d.complain_id
    LEFT JOIN consular_users u ON u.id = ca.assigned_to_user_id
  `;
}

function mapComplaintRow(row) {
  if (!row) {
    return null;
  }

  const type = normalizeComplaintType(
    row.complain_catagory,
    row.complain_type,
    row.complain_category_name,
  );
  const status = normalizeStatus(row.normalized_status || row.complain_status);
  const workerName = fallbackText(
    row.behalf_user || row.complain_user,
    "Not provided",
  );
  const workCountry = fallbackText(row.work_country, "Not provided");
  const reportedTime = row.reported_time || row.updated_time;
  const updatedTime = row.updated_time || row.reported_time;

  return {
    id: row.complain_id,
    referenceNo: row.complain_id,
    workerName,
    workerNIC: fallbackText(row.nic_no),
    workerPassport: fallbackText(row.passport_no),
    workerAddress: workCountry,
    workerContact: fallbackText(row.mobile_no),
    serviceId: row.complain_id,
    branch: workCountry,
    type,
    status,
    priority: getPriority(type, status),
    registrationPath: row.behalf_user ? "CONSULAR" : "SLBFE",
    description:
      fallbackText(row.first_comment) ||
      fallbackText(row.complain_category_name) ||
      "No complaint description recorded.",
    assignedTo: row.assigned_to_user_id || null,
    assignedToName: row.assigned_to_name || null,
    dateSubmitted: reportedTime,
    dateUpdated: updatedTime,
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

function buildFilterClauses(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.search) {
    clauses.push(`
      (
        d.complain_id LIKE :search OR
        d.complain_user LIKE :search OR
        d.behalf_user LIKE :search OR
        d.nic_no LIKE :search OR
        d.passport_no LIKE :search
      )
    `);
    params.search = `%${filters.search}%`;
  }

  if (filters.statuses && filters.statuses.length) {
    const statuses = Array.from(new Set(filters.statuses.map(normalizeStatus)));
    clauses.push(
      buildInClause(statusCaseSql("d.complain_status"), statuses, "status", params),
    );
  }

  if (filters.types && filters.types.length) {
    const types = Array.from(
      new Set(filters.types.map((type) => normalizeComplaintType(type))),
    );
    clauses.push(`
      (
        ${buildInClause("d.complain_catagory", types, "category", params)}
        OR ${buildInClause("d.complain_type", types, "type", params)}
      )
    `);
  }

  if (filters.dateFrom) {
    clauses.push(`${getComplaintDateExpression()} >= :dateFrom`);
    params.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo) {
    clauses.push(`${getComplaintDateExpression()} <= :dateTo`);
    params.dateTo = filters.dateTo;
  }

  if (filters.assignedTo) {
    clauses.push("ca.assigned_to_user_id = :assignedTo");
    params.assignedTo = filters.assignedTo;
  }

  if (filters.branch) {
    clauses.push("d.work_country = :branch");
    params.branch = filters.branch;
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

async function listComplaints(filters = {}) {
  const { whereClause, params } = buildFilterClauses(filters);
  const sortMap = {
    workerName: "COALESCE(d.behalf_user, d.complain_user)",
    referenceNo: "d.complain_id",
    dateSubmitted: getComplaintDateExpression(),
    dateUpdated: "d.updated_time",
    status: statusCaseSql("d.complain_status"),
  };
  const sortBy = sortMap[filters.sortBy] || getComplaintDateExpression();
  const sortDirection = filters.sortDirection === "asc" ? "ASC" : "DESC";
  const page = Math.max(0, Number(filters.page || 0));
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize || 10)));
  const offset = page * pageSize;

  const countRows = await query(
    `
      SELECT COUNT(*) AS total
      FROM complain_details d
      LEFT JOIN complaint_assignments ca ON ca.complaint_id = d.complain_id
      ${whereClause}
    `,
    { ...params },
  );

  const rows = await query(
    `
      ${getComplaintBaseSelect()}
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

function syntheticId(prefix, complaintId, timestamp, index) {
  const time = timestamp ? new Date(timestamp).getTime() : "no-time";
  return `${prefix}${index + 1}-${complaintId}-${time}`;
}

function getAuditAction(row) {
  if (row.event_type === "STATUS_CHANGED") {
    return row.new_status === "Closed" ? "Complaint closed" : "Status changed";
  }

  if (row.event_type === "ASSIGNED") {
    return "Complaint assigned";
  }

  if (row.event_type === "NOTE_ADDED") {
    return row.note_type === "WORKER_UPDATE"
      ? "Worker update added"
      : "Internal note added";
  }

  return fallbackText(row.event_type, "Complaint updated")
    .toLowerCase()
    .replace(/(^|_)([a-z])/g, (_match, separator, character) => {
      return `${separator ? " " : ""}${character.toUpperCase()}`;
    });
}

function getAuditDescription(row) {
  if (row.event_type === "STATUS_CHANGED") {
    if (row.previous_status && row.new_status) {
      return `Status changed from ${row.previous_status} to ${row.new_status}.`;
    }

    return row.new_status
      ? `Status changed to ${row.new_status}.`
      : "Complaint status changed.";
  }

  if (row.event_type === "ASSIGNED") {
    const previousAssignee =
      row.previous_assignee_name ||
      row.previous_assignee_user_id ||
      "Unassigned";
    const newAssignee =
      row.new_assignee_name || row.new_assignee_user_id || "Unassigned";

    return `Assigned from ${previousAssignee} to ${newAssignee}.`;
  }

  if (row.event_type === "NOTE_ADDED") {
    return row.note_type === "WORKER_UPDATE"
      ? "Worker update recorded on the complaint."
      : "Internal note recorded on the complaint.";
  }

  return "Complaint updated.";
}

function mapAuditHistoryRow(row) {
  return {
    id: row.id,
    complaintId: row.complaint_id,
    eventType: row.event_type,
    action: getAuditAction(row),
    description: getAuditDescription(row),
    performedBy: row.actor_name || row.updated_user_name || row.actor_user_id || "System",
    timestamp: row.created_at,
    previousStatus: row.previous_status
      ? normalizeStatus(row.previous_status)
      : undefined,
    newStatus: row.new_status ? normalizeStatus(row.new_status) : undefined,
    previousAssignee: row.previous_assignee_user_id || undefined,
    previousAssigneeName: row.previous_assignee_name || undefined,
    newAssignee: row.new_assignee_user_id || undefined,
    newAssigneeName: row.new_assignee_name || undefined,
    noteId: row.note_id || undefined,
    noteType: row.note_type || undefined,
  };
}

function parseLogStatus(message) {
  const match = String(message || "").match(/Status Changed:\s*(.+)$/i);
  return match ? normalizeStatus(match[1]) : undefined;
}

function mapComplaintLogHistoryRow(row, complaint, index) {
  return {
    id: syntheticId("CL", complaint.id, row.updated_time, index),
    complaintId: row.complain_id,
    action: row.complain_msg || "Complaint updated",
    description: row.complain_msg || "Complaint updated",
    performedBy: row.updated_user_name || row.updated_user || "System",
    timestamp: row.updated_time || complaint.dateUpdated,
    previousStatus: undefined,
    newStatus: parseLogStatus(row.complain_msg),
  };
}

function isSameEventSecond(left, right) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return false;
  }

  return Math.abs(leftTime - rightTime) <= 1000;
}

function isStructuredDuplicateLog(logRow, auditRows) {
  const logStatus = parseLogStatus(logRow.complain_msg);

  if (logStatus) {
    return auditRows.some((auditRow) => {
      return (
        auditRow.event_type === "STATUS_CHANGED" &&
        auditRow.new_status &&
        normalizeStatus(auditRow.new_status) === logStatus &&
        isSameEventSecond(logRow.updated_time, auditRow.created_at)
      );
    });
  }

  if (/^Assigned to /i.test(String(logRow.complain_msg || ""))) {
    return auditRows.some((auditRow) => {
      return (
        auditRow.event_type === "ASSIGNED" &&
        isSameEventSecond(logRow.updated_time, auditRow.created_at)
      );
    });
  }

  return false;
}

async function insertComplaintAuditEvent(connection, event) {
  if (!event) {
    return;
  }

  await connection.execute(
    `
      INSERT INTO complaint_audit_events (
        id,
        complaint_id,
        event_type,
        actor_user_id,
        actor_name,
        actor_role,
        previous_status,
        new_status,
        previous_assignee_user_id,
        previous_assignee_name,
        new_assignee_user_id,
        new_assignee_name,
        note_id,
        note_type,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      event.id,
      event.complaintId,
      event.eventType,
      event.actorUserId || null,
      event.actorName || null,
      event.actorRole || null,
      event.previousStatus || null,
      event.newStatus || null,
      event.previousAssigneeUserId || null,
      event.previousAssigneeName || null,
      event.newAssigneeUserId || null,
      event.newAssigneeName || null,
      event.noteId || null,
      event.noteType || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
    ],
  );
}

async function findComplaintById(id) {
  const complaintRows = await query(
    `
      ${getComplaintBaseSelect()}
      WHERE d.complain_id = :id
      LIMIT 1
    `,
    { id },
  );

  const complaint = mapComplaintRow(complaintRows[0]);

  if (!complaint) {
    return null;
  }

  const [attachments, auditHistory, complaintLogHistory, notes] = await Promise.all([
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
          ae.id,
          ae.complaint_id,
          ae.event_type,
          ae.actor_user_id,
          ae.actor_name,
          ae.actor_role,
          ae.previous_status,
          ae.new_status,
          ae.previous_assignee_user_id,
          ae.previous_assignee_name,
          ae.new_assignee_user_id,
          ae.new_assignee_name,
          ae.note_id,
          ae.note_type,
          ae.metadata_json,
          ae.created_at,
          u.name AS updated_user_name
        FROM complaint_audit_events ae
        LEFT JOIN consular_users u ON u.id = ae.actor_user_id
        WHERE ae.complaint_id = :id
        ORDER BY ae.created_at DESC
      `,
      { id },
    ),
    query(
      `
        SELECT
          l.complain_id,
          l.complain_msg,
          l.updated_user,
          l.updated_time,
          u.name AS updated_user_name
        FROM complain_logs l
        LEFT JOIN consular_users u ON u.id = l.updated_user
        WHERE l.complain_id = :id
        ORDER BY COALESCE(l.updated_time, '1970-01-01') DESC
      `,
      { id },
    ),
    query(
      `
        SELECT
          c.complain_id,
          c.complain_msg,
          c.updated_user,
          c.updated_time,
          u.name AS updated_user_name
        FROM complain_comments c
        LEFT JOIN consular_users u ON u.id = c.updated_user
        WHERE c.complain_id = :id
        ORDER BY COALESCE(c.updated_time, '1970-01-01') DESC
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

  complaint.history = [
    ...auditHistory.map(mapAuditHistoryRow),
    ...complaintLogHistory
      .filter((row) => !isStructuredDuplicateLog(row, auditHistory))
      .map((row, index) => mapComplaintLogHistoryRow(row, complaint, index)),
  ].sort((left, right) => {
    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
  });

  complaint.notes = notes.map((row, index) => ({
    id: syntheticId("CM", id, row.updated_time, index),
    complaintId: row.complain_id,
    type: row.updated_user ? "INTERNAL_NOTE" : "WORKER_UPDATE",
    content: row.complain_msg || "",
    author: row.updated_user_name || row.updated_user || complaint.workerName,
    timestamp: row.updated_time || complaint.dateUpdated,
    isInternal: Boolean(row.updated_user),
  }));

  return complaint;
}

async function updateComplaintStatus({
  complaintId,
  newStatus,
  note,
  actor,
  auditEvent,
}) {
  await withTransaction(async (connection) => {
    const [complaintRows] = await connection.execute(
      `
        SELECT complain_id, complain_status
        FROM complain_details
        WHERE complain_id = ?
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
        UPDATE complain_details
        SET complain_status = ?,
            resolution_catagory = ?,
            updated_time = CURRENT_TIMESTAMP,
            updated_user = ?
        WHERE complain_id = ?
      `,
      [
        newStatus,
        getResolutionCategory(newStatus),
        actor?.id || null,
        complaintId,
      ],
    );

    await connection.execute(
      `
        INSERT INTO complain_logs (
          complain_id,
          complain_msg,
          updated_user,
          updated_time
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        complaintId,
        truncate(`Status Changed: ${newStatus}`, 100),
        actor?.id || null,
      ],
    );

    if (note && note.trim()) {
      await connection.execute(
        `
          INSERT INTO complain_comments (
            complain_id,
            complain_msg,
            updated_user,
            updated_time
          ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [complaintId, truncate(note.trim(), 1000), actor?.id || null],
      );
    }

    await insertComplaintAuditEvent(connection, auditEvent);
  });

  return findComplaintById(complaintId);
}

async function assignComplaint({
  complaintId,
  officerId,
  officerName,
  nextStatus,
  note,
  actor,
  auditEvent,
}) {
  await withTransaction(async (connection) => {
    const [complaintRows] = await connection.execute(
      `
        SELECT complain_id, complain_status
        FROM complain_details
        WHERE complain_id = ?
        LIMIT 1
      `,
      [complaintId],
    );

    const complaint = complaintRows[0];

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const effectiveNextStatus =
      nextStatus || normalizeStatus(complaint.complain_status);

    await connection.execute(
      `
        INSERT INTO complaint_assignments (
          complaint_id,
          assigned_to_user_id,
          assigned_by_user_id,
          assigned_at,
          updated_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          assigned_to_user_id = VALUES(assigned_to_user_id),
          assigned_by_user_id = VALUES(assigned_by_user_id),
          updated_at = CURRENT_TIMESTAMP
      `,
      [complaintId, officerId, actor?.id || null],
    );

    await connection.execute(
      `
        UPDATE complain_details
        SET complain_status = ?,
            resolution_catagory = ?,
            updated_time = CURRENT_TIMESTAMP,
            updated_user = ?
        WHERE complain_id = ?
      `,
      [
        effectiveNextStatus,
        getResolutionCategory(effectiveNextStatus),
        actor?.id || null,
        complaintId,
      ],
    );

    await connection.execute(
      `
        INSERT INTO complain_logs (
          complain_id,
          complain_msg,
          updated_user,
          updated_time
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        complaintId,
        truncate(`Assigned to ${officerName || officerId}`, 100),
        actor?.id || null,
      ],
    );

    if (note && note.trim()) {
      await connection.execute(
        `
          INSERT INTO complain_comments (
            complain_id,
            complain_msg,
            updated_user,
            updated_time
          ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [complaintId, truncate(note.trim(), 1000), actor?.id || null],
      );
    }

    await insertComplaintAuditEvent(connection, auditEvent);
  });

  return findComplaintById(complaintId);
}

async function addNote({
  noteId,
  complaintId,
  content,
  isInternal,
  actor,
  auditEvent,
}) {
  await withTransaction(async (connection) => {
    await connection.execute(
      `
        INSERT INTO complain_comments (
          complain_id,
          complain_msg,
          updated_user,
          updated_time
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [complaintId, truncate(content, 1000), isInternal ? actor?.id || null : null],
    );

    await insertComplaintAuditEvent(connection, auditEvent);
  });

  return {
    id: noteId,
    complaintId,
    type: isInternal ? "INTERNAL_NOTE" : "WORKER_UPDATE",
    content: truncate(content, 1000),
    author: actor?.name || actor?.id || "System",
    timestamp: new Date(),
    isInternal: Boolean(isInternal),
  };
}

async function getDashboardCounts() {
  const statusExpr = statusCaseSql("d.complain_status");
  const rows = await query(
    `
      SELECT
        COUNT(*) AS total_cases,
        SUM(CASE WHEN ${statusExpr} IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS resolved_cases,
        SUM(CASE WHEN ${statusExpr} NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS open_cases
      FROM complain_details d
    `,
  );

  return rows[0] || { total_cases: 0, resolved_cases: 0, open_cases: 0 };
}

async function getDashboardCountsForOfficer(officerId) {
  const statusExpr = statusCaseSql("d.complain_status");
  const rows = await query(
    `
      SELECT
        COUNT(*) AS total_cases,
        SUM(CASE WHEN ${statusExpr} IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS resolved_cases,
        SUM(CASE WHEN ${statusExpr} NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS open_cases
      FROM complain_details d
      INNER JOIN complaint_assignments ca ON ca.complaint_id = d.complain_id
      WHERE ca.assigned_to_user_id = :officerId
    `,
    { officerId },
  );

  return rows[0] || { total_cases: 0, resolved_cases: 0, open_cases: 0 };
}

async function getWeeklyComplaintStats() {
  const statusExpr = statusCaseSql("d.complain_status");
  const complaintDateExpr = getComplaintDateExpression();

  return query(
    `
      SELECT
        DATE(${complaintDateExpr}) AS stat_date,
        SUM(1) AS submitted,
        SUM(CASE WHEN ${statusExpr} IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN ${statusExpr} NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS pending
      FROM complain_details d
      WHERE ${complaintDateExpr} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(${complaintDateExpr})
      ORDER BY DATE(${complaintDateExpr}) ASC
    `,
  );
}

async function getWeeklyComplaintStatsForOfficer(officerId) {
  const statusExpr = statusCaseSql("d.complain_status");
  const complaintDateExpr = getComplaintDateExpression();

  return query(
    `
      SELECT
        DATE(${complaintDateExpr}) AS stat_date,
        SUM(1) AS submitted,
        SUM(CASE WHEN ${statusExpr} IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN ${statusExpr} NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS pending
      FROM complain_details d
      INNER JOIN complaint_assignments ca ON ca.complaint_id = d.complain_id
      WHERE ca.assigned_to_user_id = :officerId
        AND ${complaintDateExpr} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(${complaintDateExpr})
      ORDER BY DATE(${complaintDateExpr}) ASC
    `,
    { officerId },
  );
}

async function getMonthlyComplaintStats() {
  const complaintDateExpr = getComplaintDateExpression();

  return query(
    `
      SELECT
        DATE_FORMAT(${complaintDateExpr}, '%Y-%m') AS stat_month,
        COUNT(*) AS count
      FROM complain_details d
      WHERE ${complaintDateExpr} >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
      GROUP BY DATE_FORMAT(${complaintDateExpr}, '%Y-%m')
      ORDER BY stat_month ASC
    `,
  );
}

async function getMonthlyComplaintStatsForOfficer(officerId) {
  const complaintDateExpr = getComplaintDateExpression();

  return query(
    `
      SELECT
        DATE_FORMAT(${complaintDateExpr}, '%Y-%m') AS stat_month,
        COUNT(*) AS count
      FROM complain_details d
      INNER JOIN complaint_assignments ca ON ca.complaint_id = d.complain_id
      WHERE ca.assigned_to_user_id = :officerId
        AND ${complaintDateExpr} >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
      GROUP BY DATE_FORMAT(${complaintDateExpr}, '%Y-%m')
      ORDER BY stat_month ASC
    `,
    { officerId },
  );
}

async function findComplaintsForReport(filters = {}) {
  const { whereClause, params } = buildFilterClauses(filters);
  const statusExpr = statusCaseSql("d.complain_status");
  const complaintDateExpr = getComplaintDateExpression();

  const rows = await query(
    `
      SELECT
        d.complain_id AS id,
        d.complain_id AS reference_no,
        COALESCE(d.complain_catagory, d.complain_type) AS complaint_type,
        ${statusExpr} AS status,
        d.work_country AS branch,
        ca.assigned_to_user_id,
        ${complaintDateExpr} AS date_submitted,
        d.updated_time AS date_updated,
        CASE
          WHEN ${statusExpr} IN ('Resolved', 'Closed') THEN d.updated_time
          ELSE NULL
        END AS resolved_at,
        u.name AS assigned_to_name
      FROM complain_details d
      LEFT JOIN complaint_assignments ca ON ca.complaint_id = d.complain_id
      LEFT JOIN consular_users u ON u.id = ca.assigned_to_user_id
      ${whereClause}
      ORDER BY ${complaintDateExpr} ASC
    `,
    params,
  );

  return rows.map((row) => ({
    ...row,
    complaint_type: normalizeComplaintType(row.complaint_type),
    status: normalizeStatus(row.status),
  }));
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
