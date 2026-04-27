const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");
const AppError = require("../utils/app-error");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError(401, "Authentication required");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.type && payload.type !== "access") {
      throw new AppError(401, "Invalid access token");
    }

    const userRow = await userRepository.findById(payload.sub);

    if (!userRow || !userRow.is_active) {
      throw new AppError(401, "Invalid or inactive user");
    }

    req.user = userRepository.mapUserRow(userRow);
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, "Invalid or expired token"));
  }
}

function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      next(new AppError(401, "Authentication required"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "You do not have permission to perform this action"));
      return;
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};