-- ============================================================
-- SLBFE Complaint Management System - MySQL Schema
-- ============================================================
-- Run this file to create all tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS slbfe;
USE slbfe;

-- ------------------------------------------------------------
-- 1. USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                    VARCHAR(20)   NOT NULL,
  name                  VARCHAR(150)  NOT NULL,
  email                 VARCHAR(255)  NOT NULL,
  password_hash         VARCHAR(255)  NOT NULL,
  role                  ENUM('CASE_OFFICER','SUPERVISOR') NOT NULL,
  avatar_url            VARCHAR(500)  NULL,
  phone                 VARCHAR(30)   NULL,
  location              VARCHAR(120)  NULL,
  notifications_enabled TINYINT(1)   NOT NULL DEFAULT 1,
  date_format           ENUM('DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD') NULL DEFAULT 'DD/MM/YYYY',
  is_active             TINYINT(1)   NOT NULL DEFAULT 1,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at         DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_is_active (is_active)
);

-- ------------------------------------------------------------
-- 1A. AUTH REFRESH TOKENS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id                    VARCHAR(40)   NOT NULL,
  user_id               VARCHAR(20)   NOT NULL,
  token_hash            CHAR(64)      NOT NULL,
  expires_at            DATETIME      NOT NULL,
  revoked_at            DATETIME      NULL,
  replaced_by_token_id  VARCHAR(40)   NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_refresh_tokens_hash (token_hash),
  INDEX idx_auth_refresh_tokens_user (user_id),
  INDEX idx_auth_refresh_tokens_expiry (expires_at),
  FOREIGN KEY fk_auth_refresh_tokens_user (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- 2. COMPLAINTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id                    VARCHAR(20)   NOT NULL,
  reference_no          VARCHAR(50)   NOT NULL,
  worker_name           VARCHAR(200)  NOT NULL,
  worker_nic            VARCHAR(20)   NOT NULL,
  worker_passport       VARCHAR(30)   NULL,
  worker_address        VARCHAR(255)  NOT NULL,
  worker_contact        VARCHAR(30)   NOT NULL,
  service_id            VARCHAR(50)   NOT NULL,
  branch                VARCHAR(120)  NOT NULL,
  complaint_type        ENUM('BREACH_OF_CONTRACT','LACK_OF_COMMUNICATION','SICK','BEING_JAILED','BEING_REMANDED_BY_POLICE','BEING_STRANDED','PROBLEMS_AT_HOME','DEATH','BEING_RETAINED','OTHER') NOT NULL,
  status                ENUM('Submitted','Under Review','In Progress','Awaiting Info','Resolved','Closed') NOT NULL DEFAULT 'Submitted',
  priority              ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  registration_path     ENUM('SLBFE','CONSULAR') NOT NULL,
  description           TEXT          NOT NULL,
  assigned_to_user_id   VARCHAR(20)   NULL,
  date_submitted        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_complaints_reference_no (reference_no),
  INDEX idx_complaints_status (status),
  INDEX idx_complaints_assigned (assigned_to_user_id),
  INDEX idx_complaints_type (complaint_type),
  INDEX idx_complaints_branch (branch),
  INDEX idx_complaints_status_date (status, date_submitted),
  FOREIGN KEY fk_complaints_assigned (assigned_to_user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- 3. COMPLAINT ATTACHMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_attachments (
  id                    VARCHAR(20)   NOT NULL,
  complaint_id          VARCHAR(20)   NOT NULL,
  file_name             VARCHAR(255)  NOT NULL,
  file_type             VARCHAR(100)  NOT NULL,
  file_size             BIGINT UNSIGNED NOT NULL,
  storage_url           VARCHAR(500)  NOT NULL,
  uploaded_by_user_id   VARCHAR(20)   NULL,
  uploaded_by_name      VARCHAR(150)  NOT NULL,
  uploaded_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_attachments_complaint (complaint_id),
  INDEX idx_attachments_uploaded_at (uploaded_at),
  FOREIGN KEY fk_attachments_complaint (complaint_id) REFERENCES complaints(id),
  FOREIGN KEY fk_attachments_user (uploaded_by_user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- 4. COMPLAINT HISTORY (append-only audit log)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_history (
  id                    VARCHAR(20)   NOT NULL,
  complaint_id          VARCHAR(20)   NOT NULL,
  action                VARCHAR(200)  NOT NULL,
  description           TEXT          NOT NULL,
  performed_by_user_id  VARCHAR(20)   NULL,
  performed_by_name     VARCHAR(150)  NOT NULL,
  previous_status       ENUM('Submitted','Under Review','In Progress','Awaiting Info','Resolved','Closed') NULL,
  new_status            ENUM('Submitted','Under Review','In Progress','Awaiting Info','Resolved','Closed') NULL,
  event_timestamp       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_history_complaint (complaint_id),
  INDEX idx_history_timestamp (event_timestamp),
  FOREIGN KEY fk_history_complaint (complaint_id) REFERENCES complaints(id),
  FOREIGN KEY fk_history_user (performed_by_user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- 5. COMPLAINT NOTES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_notes (
  id                    VARCHAR(20)   NOT NULL,
  complaint_id          VARCHAR(20)   NOT NULL,
  note_type             ENUM('WORKER_UPDATE','INTERNAL_NOTE','SYSTEM_LOG') NOT NULL,
  content               TEXT          NOT NULL,
  author_user_id        VARCHAR(20)   NULL,
  author_name           VARCHAR(150)  NOT NULL,
  is_internal           TINYINT(1)   NOT NULL DEFAULT 0,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NULL,
  PRIMARY KEY (id),
  INDEX idx_notes_complaint (complaint_id),
  INDEX idx_notes_is_internal (is_internal),
  FOREIGN KEY fk_notes_complaint (complaint_id) REFERENCES complaints(id),
  FOREIGN KEY fk_notes_user (author_user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- 6. NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id                    VARCHAR(20)   NOT NULL,
  recipient_user_id     VARCHAR(20)   NOT NULL,
  notification_type     ENUM('CASE_UPDATE','SYSTEM_ALERT','MENTION','ASSIGNMENT') NOT NULL,
  title                 VARCHAR(200)  NOT NULL,
  message               TEXT          NOT NULL,
  is_read               TINYINT(1)   NOT NULL DEFAULT 0,
  link_url              VARCHAR(255)  NULL,
  related_complaint_id  VARCHAR(20)   NULL,
  complaint_id          VARCHAR(20) GENERATED ALWAYS AS (related_complaint_id) VIRTUAL,
  read_at               DATETIME      NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at            DATETIME      NULL,
  PRIMARY KEY (id),
  INDEX idx_notif_recipient (recipient_user_id),
  INDEX idx_notif_is_read (is_read),
  INDEX idx_notif_recipient_read_date (recipient_user_id, is_read, created_at),
  FOREIGN KEY fk_notif_recipient (recipient_user_id) REFERENCES users(id),
  FOREIGN KEY fk_notif_complaint (related_complaint_id) REFERENCES complaints(id)
);

-- ============================================================
-- SEED DATA - Default supervisor account
-- Password: Admin@1234 (bcrypt hashed)
-- ============================================================
INSERT IGNORE INTO users (id, name, email, password_hash, role, phone, location, is_active, created_at, updated_at)
VALUES (
  'USR001',
  'Admin Supervisor',
  'admin@slbfe.gov.lk',
  '$2a$10$FzsurGkx3XTKzpFxLLw1Qe5iJhYe8XYh8RmNSeFc7d0/oL588NiVq',
  'SUPERVISOR',
  '+94 11 000 0000',
  'Colombo',
  1,
  NOW(),
  NOW()
);

-- ============================================================
-- DEMO SEED DATA - Shared database examples
-- Complaints below are written as worker-submitted narratives.
-- Case Officer Password: Officer@1234
-- ============================================================
INSERT IGNORE INTO users (
  id,
  name,
  email,
  password_hash,
  role,
  phone,
  location,
  notifications_enabled,
  date_format,
  is_active,
  created_at,
  updated_at
) VALUES (
  'USR002',
  'Iman Fernando',
  'officer@slbfe.gov.lk',
  '$2a$10$.EB6SqAjGcfhd6UM14RTBOtW0zTBwPToRISjSyXX9/4s3KlvT2Jde',
  'CASE_OFFICER',
  '+94 77 234 5678',
  'Colombo',
  1,
  'DD/MM/YYYY',
  1,
  NOW(),
  NOW()
);

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
) VALUES (
  'C001',
  'R10001',
  'Saman Chathuranga Perera',
  '199234567890',
  'N7684521',
  'Room 14, Al Jleeb Labour Accommodation, Kuwait City',
  '+965 66234198',
  'SLBFE-KWT-2214',
  'Kuwait',
  'BREACH_OF_CONTRACT',
  'In Progress',
  'HIGH',
  'CONSULAR',
  'I have not received my salary for the last three months. My employer is also forcing me to work overtime without payment and my passport has been kept in the office. I am unable to leave the work site or change my job because they are refusing to return my passport.',
  'USR002',
  '2026-04-18 08:40:00',
  '2026-04-21 11:10:00',
  '2026-04-18 08:40:00',
  '2026-04-21 11:10:00'
), (
  'C002',
  'R10002',
  'Tharindu Lakmal Silva',
  '198765432145',
  'OL5432189',
  'Building 8, Exit 18 Staff Quarters, Riyadh',
  '+966 558732104',
  'SLBFE-RYD-1183',
  'Riyadh',
  'LACK_OF_COMMUNICATION',
  'Awaiting Info',
  'MEDIUM',
  'CONSULAR',
  'I came to Saudi Arabia nearly two years ago and my company has not given me any annual leave even though it is mentioned in my contract. When I asked for leave to come home because my mother is sick, the supervisor said I can go only if I buy my own ticket and sign a paper saying I have no claims. Please help me to get my leave properly.',
  'USR002',
  '2026-04-17 19:25:00',
  '2026-04-20 14:05:00',
  '2026-04-17 19:25:00',
  '2026-04-20 14:05:00'
), (
  'C003',
  'R10003',
  'Nadeesha Kumari Jayawardena',
  '199678901234',
  'P9843216',
  'Villa 22, Al Nahda, Dubai',
  '+971 551183624',
  'SLBFE-DXB-4402',
  'Dubai',
  'BEING_RETAINED',
  'In Progress',
  'CRITICAL',
  'CONSULAR',
  'I am working as a housemaid in Dubai. Madam has taken my passport and phone and does not allow me to contact my family freely. I am shouted at daily and I have not been allowed to leave the house alone. Last week I was pushed during an argument and I am now scared to stay here. Please help me urgently.',
  NULL,
  '2026-04-16 06:50:00',
  '2026-04-19 09:40:00',
  '2026-04-16 06:50:00',
  '2026-04-19 09:40:00'
), (
  'C004',
  'R10004',
  'Kasun Madushanka Ranasinghe',
  '199045612378',
  'N5439872',
  'Camp 3, Industrial Area, Doha',
  '+974 66554821',
  'SLBFE-DOH-7820',
  'Doha',
  'BREACH_OF_CONTRACT',
  'Resolved',
  'HIGH',
  'SLBFE',
  'I am working in a construction company in Doha. For the last several weeks we have been taken to work in the afternoon heat without proper drinking water or safety equipment. Two workers fainted on site. After I complained, the site supervisor threatened to send me back to Sri Lanka. I need help because the conditions are not safe.',
  'USR002',
  '2026-04-10 12:15:00',
  '2026-04-15 17:20:00',
  '2026-04-10 12:15:00',
  '2026-04-15 17:20:00'
);

INSERT IGNORE INTO complaint_history (
  id,
  complaint_id,
  action,
  description,
  performed_by_user_id,
  performed_by_name,
  previous_status,
  new_status,
  event_timestamp,
  created_at
) VALUES (
  'H001',
  'C001',
  'Status Changed: Under Review',
  'Case moved from Submitted to Under Review after initial complaint screening.',
  'USR001',
  'Admin Supervisor',
  'Submitted',
  'Under Review',
  '2026-04-18 10:10:00',
  '2026-04-18 10:10:00'
), (
  'H002',
  'C001',
  'Status Changed: In Progress',
  'Case moved from Under Review to In Progress after salary and passport retention concerns were confirmed for follow-up.',
  'USR002',
  'Iman Fernando',
  'Under Review',
  'In Progress',
  '2026-04-21 11:10:00',
  '2026-04-21 11:10:00'
), (
  'H003',
  'C002',
  'Status Changed: Awaiting Info',
  'Requested supporting contract pages and leave records from the worker before contacting the employer.',
  'USR002',
  'Iman Fernando',
  'Submitted',
  'Awaiting Info',
  '2026-04-20 14:05:00',
  '2026-04-20 14:05:00'
), (
  'H004',
  'C003',
  'Status Changed: In Progress',
  'Case moved to In Progress for urgent handling due to alleged confinement, passport confiscation, and physical intimidation.',
  'USR001',
  'Admin Supervisor',
  'Under Review',
  'In Progress',
  '2026-04-19 09:40:00',
  '2026-04-19 09:40:00'
), (
  'H005',
  'C004',
  'Assigned to Iman Fernando',
  'Case assigned for follow-up with the Qatar labour welfare officer and employer representative.',
  'USR001',
  'Admin Supervisor',
  'Submitted',
  'Under Review',
  '2026-04-11 09:00:00',
  '2026-04-11 09:00:00'
), (
  'H006',
  'C004',
  'Status Changed: Resolved',
  'Case marked resolved after the employer agreed to improve site conditions and the worker confirmed the immediate issue was addressed.',
  'USR002',
  'Iman Fernando',
  'Under Review',
  'Resolved',
  '2026-04-15 17:20:00',
  '2026-04-15 17:20:00'
);

INSERT IGNORE INTO complaint_notes (
  id,
  complaint_id,
  note_type,
  content,
  author_user_id,
  author_name,
  is_internal,
  created_at,
  updated_at
) VALUES (
  'N001',
  'C001',
  'WORKER_UPDATE',
  'I spoke to another Sri Lankan worker in the same camp and he said the company also kept his passport. I can send my salary slips and my contract if needed.',
  NULL,
  'Saman Chathuranga Perera',
  0,
  '2026-04-19 07:20:00',
  '2026-04-19 07:20:00'
), (
  'N002',
  'C001',
  'INTERNAL_NOTE',
  'Employer contact details were verified. Salary slips received from the worker will be checked with the recruiting agency before formal employer outreach.',
  'USR002',
  'Iman Fernando',
  1,
  '2026-04-21 11:30:00',
  '2026-04-21 11:30:00'
), (
  'N003',
  'C002',
  'WORKER_UPDATE',
  'I uploaded the page from my contract that says I should get annual leave after one year. I also attached the message where my supervisor told me to buy my own ticket.',
  NULL,
  'Tharindu Lakmal Silva',
  0,
  '2026-04-19 18:10:00',
  '2026-04-19 18:10:00'
), (
  'N004',
  'C002',
  'INTERNAL_NOTE',
  'Waiting for a clearer copy of the passport bio page and employer contact number before proceeding through Riyadh mission channels.',
  'USR002',
  'Iman Fernando',
  1,
  '2026-04-20 14:20:00',
  '2026-04-20 14:20:00'
), (
  'N005',
  'C003',
  'INTERNAL_NOTE',
  'Risk indicators are high. Supervisor instructed immediate coordination with the Dubai mission because the complaint includes confinement and physical intimidation.',
  'USR001',
  'Admin Supervisor',
  1,
  '2026-04-19 10:05:00',
  '2026-04-19 10:05:00'
), (
  'N006',
  'C004',
  'WORKER_UPDATE',
  'After the labour officer visited the site, the company started giving us drinking water and safety belts. They also changed the afternoon shift timing. I am sending this update to confirm the situation is better now.',
  NULL,
  'Kasun Madushanka Ranasinghe',
  0,
  '2026-04-15 15:45:00',
  '2026-04-15 15:45:00'
), (
  'N007',
  'C004',
  'INTERNAL_NOTE',
  'Worker confirmed improved site conditions and no further threats from the supervisor. Case can be closed if there are no further complaints within a week.',
  'USR002',
  'Iman Fernando',
  1,
  '2026-04-15 16:10:00',
  '2026-04-15 16:10:00'
);

INSERT IGNORE INTO notifications (
  id,
  recipient_user_id,
  notification_type,
  title,
  message,
  is_read,
  link_url,
  related_complaint_id,
  created_at,
  deleted_at
) VALUES (
  'NTF001',
  'USR001',
  'CASE_UPDATE',
  'Case R10001 Updated',
  'Status changed to In Progress for complaint R10001.',
  0,
  '/complaints/C001',
  'C001',
  '2026-04-21 11:35:00',
  NULL
), (
  'NTF002',
  'USR002',
  'ASSIGNMENT',
  'New Case Assigned',
  'Case R10001 has been assigned to you.',
  0,
  '/complaints/C001',
  'C001',
  '2026-04-18 10:15:00',
  NULL
), (
  'NTF003',
  'USR002',
  'CASE_UPDATE',
  'Case R10004 Updated',
  'Status changed to Resolved for complaint R10004.',
  1,
  '/complaints/C004',
  'C004',
  '2026-04-15 17:25:00',
  NULL
), (
  'NTF004',
  'USR001',
  'SYSTEM_ALERT',
  'Urgent Case In Progress',
  'Complaint R10003 was moved to In Progress for urgent intervention.',
  0,
  '/complaints/C003',
  'C003',
  '2026-04-19 09:45:00',
  NULL
);
