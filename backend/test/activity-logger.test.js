const test = require("node:test");
const assert = require("node:assert/strict");

const { formatIstTimestamp } = require("../src/utils/activity-logger");

test("formatIstTimestamp returns human-readable IST time", () => {
  const timestamp = formatIstTimestamp(new Date("2026-04-30T10:08:57Z"));

  assert.equal(timestamp, "30 Apr 2026, 15:38:57 IST");
});
