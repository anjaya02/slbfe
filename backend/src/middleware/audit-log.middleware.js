const { writeComplaintLog } = require("../utils/activity-logger");

const SENSITIVE_BODY_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
]);

function getDurationMs(startedAt) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

function getSafeObjectSummary(value) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined && item !== "")
    .map(([key, item]) => [
      key,
      SENSITIVE_BODY_KEYS.has(key) ? "[REDACTED]" : item,
    ]);

  if (!entries.length) {
    return undefined;
  }

  return JSON.stringify(Object.fromEntries(entries));
}

function getBodyKeys(body) {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const keys = Object.keys(body).filter((key) => !SENSITIVE_BODY_KEYS.has(key));
  return keys.length ? keys.join(",") : undefined;
}

function auditRequest(scope) {
  return function auditRequestMiddleware(req, res, next) {
    const startedAt = process.hrtime.bigint();
    let logged = false;

    function writeRequestLog(outcome) {
      if (logged) {
        return;
      }

      logged = true;
      writeComplaintLog(`${scope}_${outcome}`, {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: getDurationMs(startedAt).toFixed(1),
        ip: req.ip || req.socket?.remoteAddress,
        params: getSafeObjectSummary(req.params),
        query: getSafeObjectSummary(req.query),
        bodyKeys: getBodyKeys(req.body),
      });
    }

    res.on("finish", () => writeRequestLog("REQUEST_FINISHED"));
    res.on("close", () => {
      if (!res.writableEnded) {
        writeRequestLog("REQUEST_ABORTED");
      }
    });

    next();
  };
}

module.exports = {
  auditRequest,
};
