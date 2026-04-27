require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const mysql = require("mysql2/promise");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await connection.execute(
      `
        INSERT IGNORE INTO complaints (
          id,
          reference_no,
          worker_name,
          worker_nic,
          worker_passport,
          worker_address,
          worker_contact,
          service_id,
          branch,
          complaint_type,
          status,
          priority,
          registration_path,
          description,
          assigned_to_user_id,
          date_submitted,
          date_updated,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        "C002",
        "R10002",
        "Aman Bey",
        "198876543210",
        null,
        "Block C, Worker Housing, Riyadh",
        "0912345678",
        "088-5678",
        "Riyadh",
        "LACK_OF_COMMUNICATION",
        "Resolved",
        "MEDIUM",
        "CONSULAR",
        "Worker reported not receiving annual leave for two years. The issue was resolved after consular intervention and employer confirmation.",
        null,
        "2026-04-21 10:15:00",
        "2026-04-23 11:20:00",
        "2026-04-21 10:15:00",
        "2026-04-23 11:20:00",
      ],
    );

    console.log("dashboard-demo-seed-ok");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});