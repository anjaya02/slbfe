require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const mysql = require("mysql2/promise");

// Adds two deterministic complaints for manually testing Sinhala and Tamil PDF
// output. Re-running this script replaces only these records.
const TEST_COMPLAINTS = [
  {
    id: "PDF-SI-001",
    name: "පී. නිමාලි පෙරේරා",
    mobile: "+965 5550 0101",
    passport: "PDFSI001",
    nic: "199055500101",
    country: "කුවේට්",
    description:
      "[PDF පරීක්ෂණය] මාස තුනක වැටුප නොලැබුණු අතර සේවායෝජකයා විදේශ ගමන් බලපත්‍රය ආපසු ලබා නොදෙයි. කරුණාකර හදිසි සහාය ලබා දෙන්න.",
    workerNote:
      "සිංහල අකුරු, පිල්ලම් සහ සංයුක්ත අක්ෂර නිවැරදිව පෙන්වන්නේදැයි පරීක්ෂා කිරීම සඳහා මෙම සටහන එක් කර ඇත.",
    internalNote:
      "නිලධාරියා ලේඛන පරීක්ෂා කර කුවේට් දූත මණ්ඩලය සමඟ සම්බන්ධීකරණය ආරම්භ කර ඇත.",
    history: "පැමිණිල්ල පරීක්ෂා කිරීම සඳහා නිලධාරියෙකුට පවරන ලදී.",
    reportedAt: "2026-09-02 09:00:00",
    updatedAt: "2026-09-02 09:20:00",
  },
  {
    id: "PDF-TA-001",
    name: "எஸ். கவிதா ராஜன்",
    mobile: "+965 5550 0202",
    passport: "PDFTA001",
    nic: "199155500202",
    country: "குவைத்",
    description:
      "[PDF சோதனை] கடந்த மூன்று மாதங்களாக சம்பளம் வழங்கப்படவில்லை. தொழிலாளியின் கடவுச்சீட்டையும் முதலாளி திருப்பிக் கொடுக்கவில்லை. அவசர உதவி தேவை.",
    workerNote:
      "தமிழ் உயிர்மெய் எழுத்துகள் மற்றும் கூட்டெழுத்துகள் PDF ஆவணத்தில் சரியாக வடிவமைக்கப்படுகின்றனவா என்பதைச் சோதிக்கும் குறிப்பு இது.",
    internalNote:
      "அதிகாரி ஆவணங்களைச் சரிபார்த்து குவைத் தூதரகத்துடன் ஒருங்கிணைப்பைத் தொடங்கியுள்ளார்.",
    history: "முறைப்பாடு பரிசீலனைக்காக அதிகாரியிடம் ஒப்படைக்கப்பட்டது.",
    reportedAt: "2026-09-02 09:05:00",
    updatedAt: "2026-09-02 09:25:00",
  },
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
  });
  const ids = TEST_COMPLAINTS.map(({ id }) => id);
  const placeholders = ids.map(() => "?").join(", ");

  try {
    // A transaction makes sure we do not leave half-created test data behind.
    await connection.beginTransaction();

    // Delete child rows first because they refer to the main complaint row.
    // The WHERE clause is limited to the two PDF test IDs above.
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
      `DELETE FROM complaint_attachments WHERE complaint_id IN (${placeholders})`,
      ids,
    );
    await connection.execute(
      `DELETE FROM complain_details WHERE complain_id IN (${placeholders})`,
      ids,
    );

    for (const complaint of TEST_COMPLAINTS) {
      // Create the main complaint that will appear in the admin complaint list.
      await connection.execute(
        `
          INSERT INTO complain_details (
            complain_id,
            complain_type,
            complain_user,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          complaint.id,
          "OTHER",
          complaint.name,
          complaint.mobile,
          complaint.passport,
          complaint.nic,
          complaint.country,
          complaint.description,
          complaint.reportedAt,
          "වෙනත් | மற்றவை | Other",
          "99",
          "Under Review",
          "SLBFE",
          complaint.updatedAt,
          "USR001",
        ],
      );

      // Assign it to the demo officer so the PDF also has an officer name.
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
          complaint.id,
          "USR002",
          "USR001",
          complaint.reportedAt,
          complaint.updatedAt,
        ],
      );

      // Add one worker update and one internal admin note in the same language.
      await connection.execute(
        `
          INSERT INTO complain_comments (
            complain_id,
            complain_msg,
            updated_user,
            updated_time
          ) VALUES (?, ?, NULL, ?), (?, ?, 'USR001', ?)
        `,
        [
          complaint.id,
          complaint.workerNote,
          complaint.reportedAt,
          complaint.id,
          complaint.internalNote,
          complaint.updatedAt,
        ],
      );

      // This gives the Case Management History section multilingual text too.
      await connection.execute(
        `
          INSERT INTO complain_logs (
            complain_id,
            complain_msg,
            updated_user,
            updated_time
          ) VALUES (?, ?, 'USR001', ?)
        `,
        [complaint.id, complaint.history, complaint.updatedAt],
      );
    }

    // Read the values back before committing. This catches database encoding
    // problems instead of silently inserting broken text.
    const [storedRows] = await connection.execute(
      `
        SELECT complain_id, complain_user, work_country, description
        FROM complain_details
        WHERE complain_id IN (${placeholders})
        ORDER BY complain_id
      `,
      ids,
    );

    for (const expected of TEST_COMPLAINTS) {
      const stored = storedRows.find((row) => row.complain_id === expected.id);
      if (
        !stored ||
        stored.complain_user !== expected.name ||
        stored.work_country !== expected.country ||
        stored.description !== expected.description
      ) {
        throw new Error(`Unicode round-trip verification failed for ${expected.id}`);
      }
    }

    await connection.commit();
    console.log(`pdf-unicode-seed-ok: inserted and verified ${ids.join(", ")}`);
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
