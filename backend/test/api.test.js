const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const jwt = require("jsonwebtoken");
const request = require("supertest");

const app = require("../src/index");
const authService = require("../src/services/auth.service");
const complaintService = require("../src/services/complaint.service");
const complaintRepository = require("../src/repositories/complaint.repository");
const userService = require("../src/services/user.service");
const userRepository = require("../src/repositories/user.repository");

const originalFunctions = {
  authLogin: authService.login,
  authRefreshSession: authService.refreshSession,
  authLogout: authService.logout,
  dashboardStats: complaintService.getDashboardStats,
  generateReport: complaintService.generateReport,
  complaintFindById: complaintRepository.findComplaintById,
  getUsers: userService.getUsers,
  userFindById: userRepository.findById,
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
  complaintRepository.findComplaintById = originalFunctions.complaintFindById;
  userService.getUsers = originalFunctions.getUsers;
  userRepository.findById = originalFunctions.userFindById;
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
  complaintService.generateReport = async () => ({ title: "Monthly Report" });

  const response = await request(app)
    .post("/api/reports/generate")
    .set("Authorization", `Bearer ${signToken(supervisor)}`)
    .send({ reportType: "MONTHLY" });

  assert.equal(response.status, 200);
  assert.equal(response.body.title, "Monthly Report");
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