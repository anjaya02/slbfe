require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const mysql = require("mysql2/promise");

// Seeds a batch of mock case officers so the "Assign To" dropdown on the
// complaints list has enough options to test the search filter. Idempotent:
// it deletes any users in its ID range (USR101..) before inserting.
//
// Usage:
//   node scripts/seed-mock-users.js
//
// All seeded officers share the same password as the demo officer account
// ("officer@slbfe.gov.lk"), so they can log in with the same password if needed.

const PASSWORD_HASH = "$2a$10$.EB6SqAjGcfhd6UM14RTBOtW0zTBwPToRISjSyXX9/4s3KlvT2Jde";

const START_INDEX = 101;

const OFFICERS = [
  "Nimal Perera",
  "Kamala Silva",
  "Sunil Fernando",
  "Priya Jayawardena",
  "Ruwan Bandara",
  "Dilani Ranasinghe",
  "Ajith Wickramasinghe",
  "Shanika Gunawardena",
  "Chaminda Dissanayake",
  "Nadeeka Rajapaksa",
  "Bhanuka Senanayake",
  "Tharaka Herath",
];

function pad(num, size) {
  return String(num).padStart(size, "0");
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const ids = OFFICERS.map((_, i) => `USR${pad(START_INDEX + i, 3)}`);

  try {
    await connection.beginTransaction();

    // Clean up any previous run of this seed.
    const placeholders = ids.map(() => "?").join(", ");
    await connection.execute(
      `DELETE FROM consular_users WHERE id IN (${placeholders})`,
      ids,
    );

    for (let i = 0; i < OFFICERS.length; i += 1) {
      const id = ids[i];
      const name = OFFICERS[i];
      const email = `officer${pad(START_INDEX + i, 3)}@slbfe.gov.lk`;
      const phone = `+94 77 ${pad(1000000 + i * 12345, 7)}`;

      await connection.execute(
        `
          INSERT INTO consular_users (
            id,
            name,
            email,
            password_hash,
            role,
            phone,
            location,
            work_country,
            is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          name,
          email,
          PASSWORD_HASH,
          "CASE_OFFICER",
          phone,
          "Colombo",
          "Sri Lanka",
          1,
        ],
      );
    }

    await connection.commit();
    console.log(
      `mock-users-seed-ok: inserted ${OFFICERS.length} case officers (${ids[0]}..${ids[ids.length - 1]})`,
    );
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
