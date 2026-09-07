const fs = require("fs/promises");
const path = require("path");

const logDirectory = path.resolve(__dirname, "..", "..", "logs");
const complaintLogPath = path.join(logDirectory, "complaints.log");
const MAX_FIELD_LENGTH = 500;
const IST_TIME_ZONE = "Asia/Kolkata";

const istTimestampFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatIstTimestamp(date = new Date()) {
  return `${istTimestampFormatter.format(date)} IST`;
}

function normalizeValue(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const normalized = String(value).replace(/\s+/g, " ").trim();

  if (normalized.length <= MAX_FIELD_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_FIELD_LENGTH)}...`;
}

function formatFields(fields) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${JSON.stringify(normalizeValue(value))}`)
    .join(" ");
}

async function appendLogLine(filePath, line) {
  await fs.mkdir(logDirectory, { recursive: true });
  await fs.appendFile(filePath, `${line}\n`, "utf8");
}

function writeComplaintLog(event, fields = {}) {
  const timestamp = formatIstTimestamp();
  const line = `[${timestamp}] ${event} ${formatFields(fields)}`.trim();

  appendLogLine(complaintLogPath, line).catch((error) => {
    console.error("Failed to write complaint log", error);
  });
}

module.exports = {
  formatIstTimestamp,
  writeComplaintLog,
};
