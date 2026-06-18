const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const jwt = require("jsonwebtoken");
const request = require("supertest");

const app = require("../src/index");
const { closePool } = require("../src/config/db");
const authService = require("../src/services/auth.service");
const complaintService = require("../src/services/complaint.service");
const complaintRepository = require("../src/repositories/complaint.repository");
const notificationService = require("../src/services/notification.service");
const userService = require("../src/services/user.service");
const userRepository = require("../src/repositories/user.repository");

const originalFunctions = {
  authLogin: authService.login,
  authRefreshSession: authService.refreshSession,
  authLogout: authService.logout,
  dashboardStats: complaintService.getDashboardStats,
  generateReport: complaintService.generateReport,
  complaintList: complaintRepository.listComplaints,
  complaintDashboardCounts: complaintRepository.getDashboardCounts,
  complaintDashboardCountsForOfficer:
    complaintRepository.getDashboardCountsForOfficer,
  complaintWeeklyStats: complaintRepository.getWeeklyComplaintStats,
  complaintWeeklyStatsForOfficer:
    complaintRepository.getWeeklyComplaintStatsForOfficer,
  complaintMonthlyStats: complaintRepository.getMonthlyComplaintStats,
  complaintMonthlyStatsForOfficer:
    complaintRepository.getMonthlyComplaintStatsForOfficer,
  complaintFindForReport: complaintRepository.findComplaintsForReport,
  complaintFindById: complaintRepository.findComplaintById,
  complaintUpdateStatus: complaintRepository.updateComplaintStatus,
  complaintAssign: complaintRepository.assignComplaint,
  complaintAddNote: complaintRepository.addNote,
  complaintTransferToSlbfe: complaintRepository.transferToSlbfe,
  createStatusNotification: notificationService.createStatusNotification,
  createAssignmentNotification: notificationService.createAssignmentNotification,
  getUnreadNotificationCount: notificationService.getUnreadCount,
  getUsers: userService.getUsers,
  updateUserStatus: userService.updateUserStatus,
  userFindById: userRepository.findById,
  userUpdateUser: userRepository.updateUser,
};

function createUserRow({ id, role, email, name }) {
  return {
    id,
    name,
    email,
    role,
    avatar_url: "",
    phone: "",
    location: "",
    notifications_enabled: 1,
    date_format: "DD/MM/YYYY",
    is_active: 1,
  };
}

function signToken(user) {
  return jwt.sign(
    { role: user.role, email: user.email },
    process.env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: "1h",
    },
  );
}

function mockAuthenticatedUsers(users) {
  const userMap = new Map(users.map((user) => [user.id, user]));
  userRepository.findById = async (id) => userMap.get(id) || null;
}

test.afterEach(() => {
  authService.login = originalFunctions.authLogin;
  authService.refreshSession = originalFunctions.authRefreshSession;
  authService.logout = originalFunctions.authLogout;
  complaintService.getDashboardStats = originalFunctions.dashboardStats;
  complaintService.generateReport = originalFunctions.generateReport;
  complaintRepository.listComplaints = originalFunctions.complaintList;
  complaintRepository.getDashboardCounts =
    originalFunctions.complaintDashboardCounts;
  complaintRepository.getDashboardCountsForOfficer =
    originalFunctions.complaintDashboardCountsForOfficer;
  complaintRepository.getWeeklyComplaintStats =
    originalFunctions.complaintWeeklyStats;
  complaintRepository.getWeeklyComplaintStatsForOfficer =
    originalFunctions.complaintWeeklyStatsForOfficer;
  complaintRepository.getMonthlyComplaintStats =
    originalFunctions.complaintMonthlyStats;
  complaintRepository.getMonthlyComplaintStatsForOfficer =
    originalFunctions.complaintMonthlyStatsForOfficer;
  complaintRepository.findComplaintsForReport =
    originalFunctions.complaintFindForReport;
  complaintRepository.findComplaintById = originalFunctions.complaintFindById;
  complaintRepository.updateComplaintStatus =
    originalFunctions.complaintUpdateStatus;
  complaintRepository.assignComplaint = originalFunctions.complaintAssign;
  complaintRepository.addNote = originalFunctions.complaintAddNote;
  complaintRepository.transferToSlbfe =
    originalFunctions.complaintTransferToSlbfe;
  notificationService.createStatusNotification =
    originalFunctions.createStatusNotification;
  notificationService.createAssignmentNotification =
    originalFunctions.createAssignmentNotification;
  notificationService.getUnreadCount =
    originalFunctions.getUnreadNotificationCount;
  userService.getUsers = originalFunctions.getUsers;
  userService.updateUserStatus = originalFunctions.updateUserStatus;
  userRepository.findById = originalFunctions.userFindById;
  userRepository.updateUser = originalFunctions.userUpdateUser;
});

test.after(async () => {
  await closePool();
});

test("POST /api/auth/login rejects invalid payloads", async () => {
  const response = await request(app).post("/api/auth/login").send({
    email: "",
    password: "short",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /Invalid request body/i);
});

test("POST /api/auth/login returns tokens and user data", async () => {
  authService.login = async ({ email }) => ({
    token: "token-value",
    refreshToken: "refresh-token-value",
    user: {
      id: "USR_ADMIN",
      name: "Admin User",
      email,
      role: "SUPERVISOR",
    },
  });

  const response = await request(app).post("/api/auth/login").send({
    email: "admin@slbfe.gov.lk",
    password: "Admin@1234",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.token, "token-value");
  assert.equal(response.body.user.role, "SUPERVISOR");
});

test("POST /api/auth/refresh rotates session tokens", async () => {
  authService.refreshSession = async (refreshToken) => ({
    token: `new-access-${refreshToken}`,
    refreshToken: "new-refresh-token",
    user: {
      id: "USR_ADMIN",
      name: "Admin User",
      email: "admin@slbfe.gov.lk",
      role: "SUPERVISOR",
    },
  });

  const response = await request(app).post("/api/auth/refresh").send({
    refreshToken: "existing-refresh-token",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.refreshToken, "new-refresh-token");
});

test("POST /api/auth/logout revokes refresh token session", async () => {
  authService.logout = async () => ({ success: true });

  const response = await request(app).post("/api/auth/logout").send({
    refreshToken: "existing-refresh-token",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test("GET /api/dashboard/stats returns global scope for supervisors", async () => {
  const supervisor = createUserRow({
    id: "USR_SUP",
    role: "SUPERVISOR",
    email: "admin@slbfe.gov.lk",
    name: "Supervisor",
  });

  mockAuthenticatedUsers([supervisor]);
  complaintService.getDashboardStats = async (user) => ({
    scope: user.role === "CASE_OFFICER" ? "ASSIGNED" : "GLOBAL",
  });

  const response = await request(app)
    .get("/api/dashboard/stats")
    .set("Authorization", `Bearer ${signToken(supervisor)}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.scope, "GLOBAL");
});

test("GET /api/dashboard/stats returns assigned scope for case officers", async () => {
  const officer = createUserRow({
    id: "USR_OFF",
    role: "CASE_OFFICER",
    email: "officer@slbfe.gov.lk",
    name: "Case Officer",
  });

  mockAuthenticatedUsers([officer]);
  complaintService.getDashboardStats = async (user) => ({
    scope: user.role === "CASE_OFFICER" ? "ASSIGNED" : "GLOBAL",
  });

  const response = await request(app)
    .get("/api/dashboard/stats")
    .set("Authorization", `Bearer ${signToken(officer)}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.scope, "ASSIGNED");
});

test("POST /api/reports/generate blocks case officers", async () => {
  const officer = createUserRow({
    id: "USR_OFF",
    role: "CASE_OFFICER",
    email: "officer@slbfe.gov.lk",
    name: "Case Officer",
  });

  mockAuthenticatedUsers([officer]);

  const response = await request(app)
    .post("/api/reports/generate")
    .set("Authorization", `Bearer ${signToken(officer)}`)
    .send({ reportType: "MONTHLY" });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /permission/i);
});

test("POST /api/reports/generate allows supervisors", async () => {
  const supervisor = createUserRow({
    id: "USR_SUP",
    role: "SUPERVISOR",
    email: "admin@slbfe.gov.lk",
    name: "Supervisor",
  });

  mockAuthenticatedUsers([supervisor]);
  let reportActor = null;
  complaintService.generateReport = async (_filter, actor) => {
    reportActor = actor;
    return { title: "Monthly Report" };
  };

  const response = await request(app)
    .post("/api/reports/generate")
    .set("Authorization", `Bearer ${signToken(supervisor)}`)
    .send({ reportType: "MONTHLY" });

  assert.equal(response.status, 200);
  assert.equal(response.body.title, "Monthly Report");
  assert.equal(reportActor.id, "USR_SUP");
});

test("GET /api/notifications/unread-count returns the current user's count", async () => {
  const officer = createUserRow({
    id: "USR_OFF",
    role: "CASE_OFFICER",
    email: "officer@slbfe.gov.lk",
    name: "Case Officer",
  });
  let countedUserId = null;

  mockAuthenticatedUsers([officer]);
  notificationService.getUnreadCount = async (userId) => {
    countedUserId = userId;
    return { unreadCount: 3 };
  };

  const response = await request(app)
    .get("/api/notifications/unread-count")
    .set("Authorization", `Bearer ${signToken(officer)}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.unreadCount, 3);
  assert.equal(countedUserId, "USR_OFF");
});

test("GET /api/users blocks case officers", async () => {
  const officer = createUserRow({
    id: "USR_OFF",
    role: "CASE_OFFICER",
    email: "officer@slbfe.gov.lk",
    name: "Case Officer",
  });

  mockAuthenticatedUsers([officer]);

  const response = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${signToken(officer)}`);

  assert.equal(response.status, 403);
  assert.match(response.body.message, /permission/i);
});

test("GET /api/users allows supervisors", async () => {
  const supervisor = createUserRow({
    id: "USR_SUP",
    role: "SUPERVISOR",
    email: "admin@slbfe.gov.lk",
    name: "Supervisor",
  });

  mockAuthenticatedUsers([supervisor]);
  userService.getUsers = async () => [
    {
      id: "USR_SUP",
      name: "Supervisor",
      email: "admin@slbfe.gov.lk",
      role: "SUPERVISOR",
    },
  ];

  const response = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${signToken(supervisor)}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].role, "SUPERVISOR");
});

test("PATCH /api/users/:id/status passes the actor id to prevent self-deactivation", async () => {
  const supervisor = createUserRow({
    id: "USR_SUP",
    role: "SUPERVISOR",
    email: "admin@slbfe.gov.lk",
    name: "Supervisor",
  });
  let actorId = null;

  mockAuthenticatedUsers([supervisor]);
  userService.updateUserStatus = async (userId, isActive, receivedActorId) => {
    actorId = receivedActorId;
    return {
      id: userId,
      name: "Supervisor",
      email: "admin@slbfe.gov.lk",
      role: "SUPERVISOR",
      isActive,
    };
  };

  const response = await request(app)
    .patch("/api/users/USR_SUP/status")
    .set("Authorization", `Bearer ${signToken(supervisor)}`)
    .send({ isActive: false });

  assert.equal(response.status, 200);
  assert.equal(actorId, "USR_SUP");
});

test("user status service blocks supervisors from deactivating themselves", async () => {
  const supervisor = createUserRow({
    id: "USR_SUP",
    role: "SUPERVISOR",
    email: "admin@slbfe.gov.lk",
    name: "Supervisor",
  });

  userRepository.findById = async () => supervisor;
  userRepository.updateUser = async () => {
    throw new Error("updateUser should not be called");
  };

  await assert.rejects(
    () => userService.updateUserStatus("USR_SUP", false, "USR_SUP"),
    {
      statusCode: 400,
      message: "You cannot deactivate your own account",
    },
  );
});

test("GET /api/complaints/:id blocks case officers from unassigned complaints", async () => {
  const officer = createUserRow({
    id: "USR_OFF",
    role: "CASE_OFFICER",
    email: "officer@slbfe.gov.lk",
    name: "Case Officer",
  });

  mockAuthenticatedUsers([officer]);
  complaintRepository.findComplaintById = async () => ({
    id: "C002",
    assignedTo: "USR_SUP",
  });

  const response = await request(app)
    .get("/api/complaints/C002")
    .set("Authorization", `Bearer ${signToken(officer)}`);

  assert.equal(response.status, 403);
  assert.match(response.body.message, /permission/i);
});

test("GET /api/complaints/:id allows supervisors to open any complaint", async () => {
  const supervisor = createUserRow({
    id: "USR_SUP",
    role: "SUPERVISOR",
    email: "admin@slbfe.gov.lk",
    name: "Supervisor",
  });

  mockAuthenticatedUsers([supervisor]);
  complaintRepository.findComplaintById = async () => ({
    id: "C002",
    assignedTo: "USR_OFF",
    referenceNo: "C002",
  });

  const response = await request(app)
    .get("/api/complaints/C002")
    .set("Authorization", `Bearer ${signToken(supervisor)}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.referenceNo, "C002");
});

test("complaint list returns only path cases matching application mode", async () => {
  const officer = {
    id: "USR_OFF",
    name: "Case Officer",
    role: "CASE_OFFICER",
  };
  let capturedFilters = null;

  complaintRepository.listComplaints = async (filters) => {
    capturedFilters = filters;
    return { data: [], total: 0 };
  };

  await complaintService.getComplaints({
    actor: officer,
    assignedTo: "USR_OTHER",
    page: 0,
    pageSize: 10,
  });

  assert.equal(capturedFilters.assignedTo, "USR_OFF");
  if (complaintService.APPLICATION_PATH === "CONSULAR") {
    assert.equal(capturedFilters.consularPathOnly, true);
    assert.equal(capturedFilters.slbfePathOnly, false);
  } else {
    assert.equal(capturedFilters.slbfePathOnly, true);
    assert.equal(capturedFilters.consularPathOnly, false);
  }
});

test("dashboard stats are scoped to path cases matching application mode", async () => {
  const officer = {
    id: "USR_OFF",
    name: "Case Officer",
    role: "CASE_OFFICER",
  };
  let capturedCountsArgs = null;
  let capturedWeeklyArgs = null;
  let capturedMonthlyArgs = null;

  complaintRepository.getDashboardCountsForOfficer = async (...args) => {
    capturedCountsArgs = args;
    return { total_cases: 0, resolved_cases: 0, open_cases: 0 };
  };
  complaintRepository.getWeeklyComplaintStatsForOfficer = async (...args) => {
    capturedWeeklyArgs = args;
    return [];
  };
  complaintRepository.getMonthlyComplaintStatsForOfficer = async (...args) => {
    capturedMonthlyArgs = args;
    return [];
  };

  await complaintService.getDashboardStats(officer);

  assert.equal(capturedCountsArgs[0], "USR_OFF");
  if (complaintService.APPLICATION_PATH === "CONSULAR") {
    assert.equal(capturedCountsArgs[1].consularPathOnly, true);
    assert.equal(capturedCountsArgs[1].slbfePathOnly, false);
    assert.equal(capturedWeeklyArgs[0], "USR_OFF");
    assert.equal(capturedWeeklyArgs[1].consularPathOnly, true);
    assert.equal(capturedWeeklyArgs[1].slbfePathOnly, false);
    assert.equal(capturedMonthlyArgs[0], "USR_OFF");
    assert.equal(capturedMonthlyArgs[1].consularPathOnly, true);
    assert.equal(capturedMonthlyArgs[1].slbfePathOnly, false);
  } else {
    assert.equal(capturedCountsArgs[1].slbfePathOnly, true);
    assert.equal(capturedCountsArgs[1].consularPathOnly, false);
    assert.equal(capturedWeeklyArgs[0], "USR_OFF");
    assert.equal(capturedWeeklyArgs[1].slbfePathOnly, true);
    assert.equal(capturedWeeklyArgs[1].consularPathOnly, false);
    assert.equal(capturedMonthlyArgs[0], "USR_OFF");
    assert.equal(capturedMonthlyArgs[1].slbfePathOnly, true);
    assert.equal(capturedMonthlyArgs[1].consularPathOnly, false);
  }
});

test("generated reports are scoped to path cases matching application mode", async () => {
  const actor = {
    id: "USR_SUP",
    name: "Supervisor",
    role: "SUPERVISOR",
  };
  let capturedFilters = null;

  complaintRepository.findComplaintsForReport = async (filters) => {
    capturedFilters = filters;
    return [];
  };

  const report = await complaintService.generateReport(
    { reportType: "MONTHLY" },
    actor,
  );

  if (complaintService.APPLICATION_PATH === "CONSULAR") {
    assert.equal(capturedFilters.consularPathOnly, true);
    assert.equal(capturedFilters.slbfePathOnly, false);
  } else {
    assert.equal(capturedFilters.slbfePathOnly, true);
    assert.equal(capturedFilters.consularPathOnly, false);
  }
  assert.equal(report.summary.totalCases, 0);
});

test("PATCH /api/complaints/:id/assignment remains supervisor-only", async () => {
  const officer = createUserRow({
    id: "USR_OFF",
    role: "CASE_OFFICER",
    email: "officer@slbfe.gov.lk",
    name: "Case Officer",
  });

  mockAuthenticatedUsers([officer]);

  const response = await request(app)
    .patch("/api/complaints/C001/assignment")
    .set("Authorization", `Bearer ${signToken(officer)}`)
    .send({ officerId: "USR_OTHER" });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /permission/i);
});

test("PATCH /api/complaints/:id/slbfe-transfer allows assigned case officers", async () => {
  const officer = createUserRow({
    id: "USR_OFF",
    role: "CASE_OFFICER",
    email: "officer@slbfe.gov.lk",
    name: "Case Officer",
  });

  mockAuthenticatedUsers([officer]);
  complaintRepository.findComplaintById = async () => ({
    id: "C008",
    referenceNo: "C008",
    status: "Under Review",
    assignedTo: "USR_OFF",
    registrationPath: "CONSULAR",
  });
  complaintRepository.transferToSlbfe = async () => ({
    id: "C008",
    referenceNo: "C008",
    assignedTo: "USR_OFF",
    registrationPath: "SLBFE",
  });

  const response = await request(app)
    .patch("/api/complaints/C008/slbfe-transfer")
    .set("Authorization", `Bearer ${signToken(officer)}`)
    .send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.registrationPath, "SLBFE");
});

test("complaint status updates carry a structured audit event", async () => {
  const actor = {
    id: "USR_OFF",
    name: "Case Officer",
    role: "CASE_OFFICER",
  };
  const existingComplaint = {
    id: "C001",
    referenceNo: "C001",
    status: "Under Review",
    assignedTo: "USR_OFF",
  };
  let capturedAuditEvent = null;

  complaintRepository.findComplaintById = async () => existingComplaint;
  complaintRepository.updateComplaintStatus = async (payload) => {
    capturedAuditEvent = payload.auditEvent;
    return {
      ...existingComplaint,
      status: payload.newStatus,
    };
  };
  notificationService.createStatusNotification = async () => ({});

  await complaintService.updateComplaintStatus({
    complaintId: "C001",
    newStatus: "In Progress",
    note: "Followed up with mission.",
    actor,
  });

  assert.match(capturedAuditEvent.id, /^AUD/);
  assert.equal(capturedAuditEvent.complaintId, "C001");
  assert.equal(capturedAuditEvent.eventType, "STATUS_CHANGED");
  assert.equal(capturedAuditEvent.actorUserId, "USR_OFF");
  assert.equal(capturedAuditEvent.actorName, "Case Officer");
  assert.equal(capturedAuditEvent.actorRole, "CASE_OFFICER");
  assert.equal(capturedAuditEvent.previousStatus, "Under Review");
  assert.equal(capturedAuditEvent.newStatus, "In Progress");
  assert.equal(capturedAuditEvent.metadata.noteAdded, true);
});

test("complaint status service rejects invalid lifecycle jumps", async () => {
  const actor = {
    id: "USR_OFF",
    name: "Case Officer",
    role: "CASE_OFFICER",
  };

  complaintRepository.findComplaintById = async () => ({
    id: "C001",
    referenceNo: "C001",
    status: "Submitted",
    assignedTo: "USR_OFF",
  });
  complaintRepository.updateComplaintStatus = async () => {
    throw new Error("updateComplaintStatus should not be called");
  };

  await assert.rejects(
    () =>
      complaintService.updateComplaintStatus({
        complaintId: "C001",
        newStatus: "In Progress",
        note: "",
        actor,
      }),
    {
      statusCode: 400,
      message: "Cannot move complaint from Submitted to In Progress",
    },
  );
});

test("complaint assignments carry assignee before and after fields", async () => {
  const actor = {
    id: "USR_SUP",
    name: "Supervisor",
    role: "SUPERVISOR",
  };
  const existingComplaint = {
    id: "C001",
    referenceNo: "C001",
    status: "Submitted",
    assignedTo: "USR_OLD",
    assignedToName: "Old Officer",
  };
  let capturedAuditEvent = null;

  complaintRepository.findComplaintById = async () => existingComplaint;
  userRepository.findById = async () => ({
    id: "USR_NEW",
    name: "New Officer",
    role: "CASE_OFFICER",
    is_active: 1,
  });
  complaintRepository.assignComplaint = async (payload) => {
    capturedAuditEvent = payload.auditEvent;
    return {
      ...existingComplaint,
      status: "Under Review",
      assignedTo: payload.officerId,
      assignedToName: payload.officerName,
    };
  };
  notificationService.createAssignmentNotification = async () => ({});

  await complaintService.assignComplaint({
    complaintId: "C001",
    officerId: "USR_NEW",
    note: "",
    actor,
  });

  assert.match(capturedAuditEvent.id, /^AUD/);
  assert.equal(capturedAuditEvent.eventType, "ASSIGNED");
  assert.equal(capturedAuditEvent.previousStatus, "Submitted");
  assert.equal(capturedAuditEvent.newStatus, "Under Review");
  assert.equal(capturedAuditEvent.previousAssigneeUserId, "USR_OLD");
  assert.equal(capturedAuditEvent.previousAssigneeName, "Old Officer");
  assert.equal(capturedAuditEvent.newAssigneeUserId, "USR_NEW");
  assert.equal(capturedAuditEvent.newAssigneeName, "New Officer");
});

test("complaint assignment does not downgrade cases already in progress", async () => {
  const actor = {
    id: "USR_SUP",
    name: "Supervisor",
    role: "SUPERVISOR",
  };
  const existingComplaint = {
    id: "C001",
    referenceNo: "C001",
    status: "In Progress",
    assignedTo: "USR_OLD",
    assignedToName: "Old Officer",
  };
  let capturedAssignmentPayload = null;

  complaintRepository.findComplaintById = async () => existingComplaint;
  userRepository.findById = async () => ({
    id: "USR_NEW",
    name: "New Officer",
    role: "CASE_OFFICER",
    is_active: 1,
  });
  complaintRepository.assignComplaint = async (payload) => {
    capturedAssignmentPayload = payload;
    return {
      ...existingComplaint,
      status: payload.nextStatus,
      assignedTo: payload.officerId,
      assignedToName: payload.officerName,
    };
  };
  notificationService.createAssignmentNotification = async () => ({});

  const updatedComplaint = await complaintService.assignComplaint({
    complaintId: "C001",
    officerId: "USR_NEW",
    note: "",
    actor,
  });

  assert.equal(capturedAssignmentPayload.nextStatus, "In Progress");
  assert.equal(capturedAssignmentPayload.auditEvent.previousStatus, "In Progress");
  assert.equal(capturedAssignmentPayload.auditEvent.newStatus, "In Progress");
  assert.equal(updatedComplaint.status, "In Progress");
});

test("opening an assigned submitted complaint acknowledges it under review", async () => {
  const actor = {
    id: "USR_OFF",
    name: "Case Officer",
    role: "CASE_OFFICER",
  };
  const existingComplaint = {
    id: "C001",
    referenceNo: "C001",
    status: "Submitted",
    assignedTo: "USR_OFF",
  };
  let capturedStatusPayload = null;

  complaintRepository.findComplaintById = async () => existingComplaint;
  complaintRepository.updateComplaintStatus = async (payload) => {
    capturedStatusPayload = payload;
    return {
      ...existingComplaint,
      status: payload.newStatus,
    };
  };

  const complaint = await complaintService.getComplaintById("C001", actor);

  assert.equal(capturedStatusPayload.newStatus, "Under Review");
  assert.equal(capturedStatusPayload.auditEvent.eventType, "STATUS_CHANGED");
  assert.equal(capturedStatusPayload.auditEvent.metadata.automatic, true);
  assert.equal(
    capturedStatusPayload.auditEvent.metadata.trigger,
    "OPEN_ASSIGNED_COMPLAINT",
  );
  assert.equal(complaint.status, "Under Review");
});

test("complaint notes carry a structured audit event with the note id", async () => {
  const actor = {
    id: "USR_OFF",
    name: "Case Officer",
    role: "CASE_OFFICER",
  };
  let capturedAuditEvent = null;

  complaintRepository.findComplaintById = async () => ({
    id: "C001",
    referenceNo: "C001",
    status: "In Progress",
    assignedTo: "USR_OFF",
  });
  complaintRepository.addNote = async (payload) => {
    capturedAuditEvent = payload.auditEvent;
    return {
      id: payload.noteId,
      complaintId: payload.complaintId,
      type: "INTERNAL_NOTE",
      content: payload.content,
      author: actor.name,
      timestamp: new Date(),
      isInternal: true,
    };
  };

  const note = await complaintService.addNote({
    complaintId: "C001",
    content: "Escalated to embassy contact.",
    isInternal: true,
    actor,
  });

  assert.match(capturedAuditEvent.id, /^AUD/);
  assert.equal(capturedAuditEvent.eventType, "NOTE_ADDED");
  assert.equal(capturedAuditEvent.noteId, note.id);
  assert.equal(capturedAuditEvent.noteType, "INTERNAL_NOTE");
  assert.equal(capturedAuditEvent.metadata.contentLength, note.content.length);
});

test("complaint SLBFE transfer updates only the complaint handling path", async () => {
  const actor = {
    id: "USR_SUP",
    name: "Supervisor",
    role: "SUPERVISOR",
  };
  const existingComplaint = {
    id: "C001",
    referenceNo: "C001",
    status: "Submitted",
    registrationPath: "CONSULAR",
  };
  let capturedTransferPayload = null;

  complaintRepository.findComplaintById = async () => existingComplaint;
  complaintRepository.transferToSlbfe = async (payload) => {
    capturedTransferPayload = payload;
    return {
      ...existingComplaint,
      registrationPath: "SLBFE",
    };
  };

  const complaint = await complaintService.transferToSlbfe({
    complaintId: "C001",
    actor,
  });

  assert.equal(capturedTransferPayload.complaintId, "C001");
  assert.equal(capturedTransferPayload.auditEvent.eventType, "SLBFE_TRANSFERRED");
  assert.equal(capturedTransferPayload.auditEvent.metadata.previousHandle, "CONSULAR");
  assert.equal(capturedTransferPayload.auditEvent.metadata.newHandle, "SLBFE");
  assert.equal(complaint.registrationPath, "SLBFE");
});
