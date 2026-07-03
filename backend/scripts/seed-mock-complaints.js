require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const mysql = require("mysql2/promise");

// Seeds 120 mock complaints for testing frontend pagination. Idempotent: it
// removes any existing rows in its ID range (and their related records) before
// inserting.
//
// Usage:
//   node scripts/seed-mock-complaints.js                 # CONSULAR path, C015-C134
//   node scripts/seed-mock-complaints.js --path=SLBFE    # SLBFE path,    C135-C254
//
// Each path uses a distinct ID range so seeding one never disturbs the other.

const COUNT = 120;

const pathArg = (process.argv.find((arg) => arg.startsWith("--path=")) || "")
  .split("=")[1];
const HANDLE = String(pathArg || "CONSULAR").toUpperCase();

if (HANDLE !== "CONSULAR" && HANDLE !== "SLBFE") {
  console.error(`Invalid --path "${pathArg}". Use CONSULAR or SLBFE.`);
  process.exit(1);
}

// CONSULAR -> C015.., SLBFE -> C135.. (non-overlapping ranges).
const START_INDEX = HANDLE === "SLBFE" ? 135 : 15;

const STATUSES = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Awaiting Info",
  "Resolved",
  "Closed",
];

const CATEGORIES = [
  "BREACH_OF_CONTRACT",
  "HARASSMENT",
  "LACK_OF_COMMUNICATION",
  "SICK",
  "BEING_JAILED",
  "BEING_REMANDED_BY_POLICE",
  "BEING_STRANDED",
  "PROBLEMS_AT_HOME",
  "DEATH",
  "BEING_RETAINED",
  "SOS",
  "OTHER",
];

const CATEGORY_MAP = {
  BREACH_OF_CONTRACT: "400",
  HARASSMENT: "450",
  LACK_OF_COMMUNICATION: "500",
  SICK: "550",
  BEING_JAILED: "600",
  BEING_REMANDED_BY_POLICE: "650",
  BEING_STRANDED: "700",
  PROBLEMS_AT_HOME: "750",
  DEATH: "800",
  BEING_RETAINED: "850",
  SOS: "875",
  OTHER: "900",
};

const COUNTRIES = [
  "Kuwait",
  "Riyadh",
  "Dubai",
  "Doha",
  "Muscat",
  "Manama",
  "Jeddah",
  "Abu Dhabi",
  "Singapore",
  "Beirut",
];

const FIRST_NAMES = [
  "Saman", "Tharindu", "Nadeesha", "Kasun", "Ishara", "Dilani", "Pradeep",
  "Chamari", "Ruwan", "Sanduni", "Lahiru", "Hashini", "Nuwan", "Gayani",
  "Sampath", "Madhavi", "Kavindu", "Thilini", "Asela", "Niluka",
];

const LAST_NAMES = [
  "Perera", "Silva", "Jayawardena", "Ranasinghe", "Fernando", "Bandara",
  "Wickramasinghe", "Gunawardena", "Dissanayake", "Rajapaksa", "Senanayake",
  "Herath", "Madushanka", "Lakmal", "Kumari",
];

const RESOLUTIONS = [
  "Recover unpaid salary and return passport",
  "Approve emergency leave or provide a fair settlement",
  "Move worker to safety and restore family contact",
  "Arrange repatriation and medical assistance",
  "Coordinate with local authorities for release",
  "Provide shelter and legal support",
];

const RESOLUTION_MAP = {
  "Recover unpaid salary and return passport": "52",
  "Approve emergency leave or provide a fair settlement": "99",
  "Move worker to safety and restore family contact": "60",
  "Arrange repatriation and medical assistance": "12",
  "Coordinate with local authorities for release": "24",
  "Provide shelter and legal support": "30",
};

// Deterministic pseudo-random so re-runs produce a stable spread.
function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pad(num, size) {
  return String(num).padStart(size, "0");
}

// Spread reported_time across the last ~120 days, updated_time shortly after.
function buildTimes(i) {
  const base = new Date("2026-06-26T09:00:00");
  const reported = new Date(base.getTime() - (COUNT - i) * 24 * 60 * 60 * 1000);
  const updated = new Date(reported.getTime() + 2 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 19).replace("T", " ");
  return { reported: fmt(reported), updated: fmt(updated) };
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const ids = Array.from({ length: COUNT }, (_, i) => `C${pad(START_INDEX + i, 3)}`);

  try {
    await connection.beginTransaction();

    // Clean up any previous run of this seed.
    const placeholders = ids.map(() => "?").join(", ");
    await connection.execute(
      `DELETE FROM complain_comments WHERE complain_id IN (${placeholders})`,
      ids,
    );
    await connection.execute(
      `DELETE FROM complain_logs WHERE complain_id IN (${placeholders})`,
      ids,
    );
    await connection.execute(
      `DELETE FROM complaint_audit_events WHERE complaint_id IN (${placeholders})`,
      ids,
    );
    await connection.execute(
      `DELETE FROM complaint_assignments WHERE complaint_id IN (${placeholders})`,
      ids,
    );
    await connection.execute(
      `DELETE FROM complain_details WHERE complain_id IN (${placeholders})`,
      ids,
    );

    for (let i = 0; i < COUNT; i += 1) {
      const id = ids[i];
      const seed = START_INDEX + i;
      const category = CATEGORIES[Math.floor(rand(seed) * CATEGORIES.length)];
      const status = STATUSES[Math.floor(rand(seed * 2) * STATUSES.length)];
      const country = COUNTRIES[Math.floor(rand(seed * 3) * COUNTRIES.length)];
      const firstName = FIRST_NAMES[Math.floor(rand(seed * 5) * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(rand(seed * 7) * LAST_NAMES.length)];
      const resolution = RESOLUTIONS[Math.floor(rand(seed * 11) * RESOLUTIONS.length)];
      const { reported, updated } = buildTimes(i);
      const fullName = `${firstName} ${lastName}`;
      const mobile = `+9${4 + (seed % 5)} ${pad(50000000 + seed * 137, 8)}`;
      const passport = `N${pad(1000000 + seed * 313, 7)}`;
      const nic = `19${pad(8000000000 + seed * 9173, 10)}`;
      const description = `Mock complaint #${i + 1}: ${fullName} reported a ${category
        .toLowerCase()
        .replace(/_/g, " ")} issue while employed in ${country}.`;

      await connection.execute(
        `
          INSERT INTO complain_details (
            complain_id,
            complain_type,
            complain_user,
            behalf_user,
            mobile_no,
            passport_no,
            nic_no,
            work_country,
            description,
            reported_time,
            complain_catagory,
            resolution_catagory,
            complain_status,
            complain_handle,
            updated_time,
            updated_user
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          category,
          fullName,
          null,
          mobile,
          passport,
          nic,
          country,
          description,
          reported,
          CATEGORY_MAP[category] || "900",
          RESOLUTION_MAP[resolution] || "99",
          status,
          HANDLE,
          updated,
          "USR002",
        ],
      );

      // Assign ~75% of complaints to a case officer.
      if (rand(seed * 13) < 0.75) {
        await connection.execute(
          `
            INSERT INTO complaint_assignments (
              complaint_id,
              assigned_to_user_id,
              assigned_by_user_id,
              assigned_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?)
          `,
          [id, "USR002", "USR001", reported, updated],
        );
      }
    }

    await connection.commit();
    console.log(`mock-complaints-seed-ok: inserted ${COUNT} ${HANDLE} rows (${ids[0]}..${ids[ids.length - 1]})`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
