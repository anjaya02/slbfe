const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", "..", ".env"),
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "slbfe",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
});

async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

async function ensureRuntimeTables() {
  await query(
    `
      CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
        id VARCHAR(40) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        replaced_by_token_id VARCHAR(40) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_auth_refresh_tokens_hash (token_hash),
        KEY idx_auth_refresh_tokens_user (user_id),
        KEY idx_auth_refresh_tokens_expiry (expires_at),
        CONSTRAINT fk_auth_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES consular_users(id)
      )
    `,
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS complaint_assignments (
        complaint_id VARCHAR(30) NOT NULL,
        assigned_to_user_id VARCHAR(20) NOT NULL,
        assigned_by_user_id VARCHAR(20) NULL,
        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (complaint_id),
        KEY idx_assignments_user (assigned_to_user_id),
        KEY idx_assignments_assigned_at (assigned_at),
        CONSTRAINT fk_assignments_user FOREIGN KEY (assigned_to_user_id) REFERENCES consular_users(id),
        CONSTRAINT fk_assignments_by_user FOREIGN KEY (assigned_by_user_id) REFERENCES consular_users(id)
      )
    `,
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS complaint_attachments (
        id VARCHAR(20) NOT NULL,
        complaint_id VARCHAR(30) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size BIGINT UNSIGNED NOT NULL,
        storage_url VARCHAR(500) NOT NULL,
        uploaded_by_user_id VARCHAR(20) NULL,
        uploaded_by_name VARCHAR(150) NOT NULL,
        uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_attachments_complaint (complaint_id),
        KEY idx_attachments_uploaded_at (uploaded_at),
        CONSTRAINT fk_attachments_user_runtime FOREIGN KEY (uploaded_by_user_id) REFERENCES consular_users(id)
      )
    `,
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(20) NOT NULL,
        recipient_user_id VARCHAR(20) NOT NULL,
        notification_type ENUM('CASE_UPDATE','SYSTEM_ALERT','MENTION','ASSIGNMENT') NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        link_url VARCHAR(255) NULL,
        related_complaint_id VARCHAR(30) NULL,
        complaint_id VARCHAR(30) GENERATED ALWAYS AS (related_complaint_id) VIRTUAL,
        read_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_notif_recipient (recipient_user_id),
        KEY idx_notif_is_read (is_read),
        KEY idx_notif_recipient_read_date (recipient_user_id, is_read, created_at),
        CONSTRAINT fk_notif_recipient_runtime FOREIGN KEY (recipient_user_id) REFERENCES consular_users(id)
      )
    `,
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS complaint_audit_events (
        id VARCHAR(30) NOT NULL,
        complaint_id VARCHAR(30) NOT NULL,
        event_type VARCHAR(40) NOT NULL,
        actor_user_id VARCHAR(20) NULL,
        actor_name VARCHAR(150) NULL,
        actor_role VARCHAR(30) NULL,
        previous_status VARCHAR(30) NULL,
        new_status VARCHAR(30) NULL,
        previous_assignee_user_id VARCHAR(20) NULL,
        previous_assignee_name VARCHAR(150) NULL,
        new_assignee_user_id VARCHAR(20) NULL,
        new_assignee_name VARCHAR(150) NULL,
        note_id VARCHAR(30) NULL,
        note_type VARCHAR(30) NULL,
        metadata_json JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_complaint_audit_complaint_created (complaint_id, created_at),
        KEY idx_complaint_audit_actor_created (actor_user_id, created_at),
        KEY idx_complaint_audit_event_type (event_type),
        CONSTRAINT fk_complaint_audit_actor_runtime FOREIGN KEY (actor_user_id) REFERENCES consular_users(id)
      )
    `,
  );
}

async function closePool() {
  await pool.end();
}

module.exports = {
  query,
  withTransaction,
  testConnection,
  ensureRuntimeTables,
  closePool,
};
