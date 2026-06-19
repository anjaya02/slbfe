const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const refreshTokenRepository = require("../repositories/refresh-token.repository");
const userRepository = require("../repositories/user.repository");
const AppError = require("../utils/app-error");
const { generateId } = require("../utils/id");

function signAccessToken(user) {
  return jwt.sign(
    {
      type: "access",
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      jwtid: crypto.randomUUID(),
    },
  );
}

function getRefreshTokenExpiryDate() {
  const days = Math.max(
    1,
    Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 7),
  );
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString("hex");
}

async function issueSessionTokens(user, replacedByTokenId = null) {
  const refreshToken = generateRefreshTokenValue();
  const refreshTokenId = generateId("RT");

  await refreshTokenRepository.createRefreshToken({
    id: refreshTokenId,
    userId: user.id,
    tokenHash: refreshTokenRepository.hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
    replacedByTokenId,
  });

  return {
    token: signAccessToken(user),
    refreshToken,
    user,
    refreshTokenId,
  };
}

function ensureActiveRefreshToken(tokenRow) {
  if (!tokenRow) {
    throw new AppError(401, "Invalid refresh token");
  }

  if (tokenRow.revoked_at) {
    throw new AppError(401, "Refresh token has been revoked");
  }

  if (new Date(tokenRow.expires_at) <= new Date()) {
    throw new AppError(401, "Refresh token has expired");
  }
}

async function login({ email, password }) {
  const userRow = await userRepository.findByEmail(email);

  if (!userRow) {
    throw new AppError(401, "Invalid email or password");
  }

  if (!userRow.is_active) {
    throw new AppError(403, "This account is inactive");
  }

  const passwordMatches = await bcrypt.compare(password, userRow.password_hash);

  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

  await userRepository.updateLastLogin(userRow.id);
  await refreshTokenRepository.deleteExpiredRefreshTokens();

  const user = userRepository.mapUserRow(userRow);
  const session = await issueSessionTokens(user);

  return {
    token: session.token,
    refreshToken: session.refreshToken,
    user: session.user,
  };
}

async function refreshSession(refreshToken) {
  const existingToken = await refreshTokenRepository.findRefreshTokenByPlainToken(
    refreshToken,
  );

  ensureActiveRefreshToken(existingToken);

  const userRow = await userRepository.findById(existingToken.user_id);

  if (!userRow || !userRow.is_active) {
    if (existingToken?.user_id) {
      await refreshTokenRepository.revokeAllRefreshTokensForUser(
        existingToken.user_id,
      );
    }

    throw new AppError(401, "Invalid or inactive user");
  }

  const user = userRepository.mapUserRow(userRow);
  const nextSession = await issueSessionTokens(user, existingToken.id);
  await refreshTokenRepository.revokeRefreshToken({
    id: existingToken.id,
    replacedByTokenId: nextSession.refreshTokenId,
  });

  return {
    token: nextSession.token,
    refreshToken: nextSession.refreshToken,
    user: nextSession.user,
  };
}

async function logout(refreshToken) {
  const existingToken = await refreshTokenRepository.findRefreshTokenByPlainToken(
    refreshToken,
  );

  if (existingToken && !existingToken.revoked_at) {
    await refreshTokenRepository.revokeRefreshToken({ id: existingToken.id });
  }

  return { success: true };
}

async function getCurrentUser(userId) {
  const userRow = await userRepository.findById(userId);

  if (!userRow) {
    throw new AppError(404, "User not found");
  }

  return userRepository.mapUserRow(userRow);
}

async function updateProfile(userId, updates) {
  const payload = {};

  if (typeof updates.name !== "undefined") payload.name = updates.name;
  if (typeof updates.phone !== "undefined") payload.phone = updates.phone;
  if (typeof updates.location !== "undefined")
    payload.location = updates.location;
  if (typeof updates.workCountry !== "undefined")
    payload.work_country = updates.workCountry;
  if (typeof updates.avatar !== "undefined")
    payload.avatar_url = updates.avatar;

  const user = await userRepository.updateUser(userId, payload);
  return userRepository.mapUserRow(user);
}

async function updatePreferences(userId, updates) {
  const payload = {};

  if (typeof updates.notificationsEnabled !== "undefined") {
    payload.notifications_enabled = Number(
      Boolean(updates.notificationsEnabled),
    );
  }

  if (typeof updates.dateFormat !== "undefined") {
    payload.date_format = updates.dateFormat;
  }

  const user = await userRepository.updateUser(userId, payload);
  const mapped = userRepository.mapUserRow(user);

  return {
    notificationsEnabled: mapped.notificationsEnabled,
    dateFormat: mapped.dateFormat,
  };
}

module.exports = {
  login,
  refreshSession,
  logout,
  getCurrentUser,
  updateProfile,
  updatePreferences,
};
