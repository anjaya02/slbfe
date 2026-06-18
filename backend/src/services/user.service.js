const bcrypt = require("bcryptjs");

const userRepository = require("../repositories/user.repository");
const AppError = require("../utils/app-error");
const { generateId } = require("../utils/id");

async function getUsers(filters) {
  return userRepository.listUsers(filters);
}

async function getCaseOfficers() {
  return userRepository.listCaseOfficers();
}

async function getUserById(userId) {
  const userRow = await userRepository.findById(userId);

  if (!userRow) {
    throw new AppError(404, "User not found");
  }

  return userRepository.mapUserRow(userRow);
}

async function createUser(data) {
  const existing = await userRepository.findByEmail(data.email);

  if (existing) {
    throw new AppError(409, "A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const created = await userRepository.createUser({
    id: generateId("USR"),
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    avatarUrl: data.avatar || "",
    phone: data.phone || "",
    location: data.location || "",
    workCountry: data.workCountry || "",
    notificationsEnabled: 1,
    dateFormat: data.dateFormat || "DD/MM/YYYY",
    isActive: 1,
  });

  return userRepository.mapUserRow(created);
}

async function updateUser(userId, updates) {
  const existing = await userRepository.findById(userId);

  if (!existing) {
    throw new AppError(404, "User not found");
  }

  const payload = {};

  if (typeof updates.name !== "undefined") payload.name = updates.name;
  if (typeof updates.email !== "undefined") payload.email = updates.email;
  if (typeof updates.role !== "undefined") payload.role = updates.role;
  if (typeof updates.phone !== "undefined") payload.phone = updates.phone;
  if (typeof updates.location !== "undefined")
    payload.location = updates.location;
  if (typeof updates.workCountry !== "undefined")
    payload.work_country = updates.workCountry;
  if (typeof updates.avatar !== "undefined")
    payload.avatar_url = updates.avatar;

  const updated = await userRepository.updateUser(userId, payload);
  return userRepository.mapUserRow(updated);
}

async function updateUserStatus(userId, isActive, actorUserId = null) {
  const existing = await userRepository.findById(userId);

  if (!existing) {
    throw new AppError(404, "User not found");
  }

  if (actorUserId === userId && !isActive) {
    throw new AppError(400, "You cannot deactivate your own account");
  }

  const updated = await userRepository.updateUser(userId, {
    is_active: Number(Boolean(isActive)),
  });

  return userRepository.mapUserRow(updated);
}

module.exports = {
  getUsers,
  getCaseOfficers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
};
