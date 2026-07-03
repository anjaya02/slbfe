require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const mysql = require("mysql2/promise");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const complaintId = "C008";

  try {
    await connection.beginTransaction();

    await connection.execute("DELETE FROM complain_comments WHERE complain_id = ?", [
      complaintId,
    ]);
    await connection.execute("DELETE FROM complain_logs WHERE complain_id = ?", [
      complaintId,
    ]);
    await connection.execute(
      "DELETE FROM complaint_audit_events WHERE complaint_id = ?",
      [complaintId],
    );
    await connection.execute(
      "DELETE FROM complaint_assignments WHERE complaint_id = ?",
      [complaintId],
    );
    await connection.execute("DELETE FROM complain_details WHERE complain_id = ?", [
      complaintId,
    ]);

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
          reported_time,
          complain_catagory,
          resolution_catagory,
          complain_status,
          updated_time,
          updated_user
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        complaintId,
        "LACK_OF_COMMUNICATION",
        "Aman Bey",
        null,
        "0912345678",
        null,
        "198876543210",
        "Riyadh",
        "2026-04-21 10:15:00",
        "500",
        "99",
        "Resolved",
        "2026-04-23 11:20:00",
        "USR002",
      ],
    );

    await connection.execute(
      `
        INSERT INTO complain_comments (
          complain_id,
          complain_msg,
          updated_user,
          updated_time
        ) VALUES (?, ?, ?, ?)
      `,
      [
        complaintId,
        "Worker reported not receiving annual leave for two years. The issue was resolved after consular intervention and employer confirmation.",
        null,
        "2026-04-21 10:15:00",
      ],
    );

    await connection.execute(
      `
        INSERT INTO complain_logs (
          complain_id,
          complain_msg,
          updated_user,
          updated_time
        ) VALUES (?, ?, ?, ?)
      `,
      [
        complaintId,
        "Status Changed: Resolved",
        "USR002",
        "2026-04-23 11:20:00",
      ],
    );

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
      [
        complaintId,
        "USR002",
        "USR001",
        "2026-04-21 10:20:00",
        "2026-04-21 10:20:00",
      ],
    );

    await connection.commit();
    console.log("dashboard-demo-seed-ok");
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
