-- ============================================================
-- SLBFE Complaint Management System - MySQL reset and seed
-- Local development schema and demo handover data
-- ============================================================

DROP DATABASE IF EXISTS slbfe;
CREATE DATABASE slbfe
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE slbfe;

-- ------------------------------------------------------------
-- AUTH TABLES
-- ------------------------------------------------------------
CREATE TABLE `consular_users` (
  `id` varchar(20) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('CASE_OFFICER','SUPERVISOR') NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `location` varchar(120) DEFAULT NULL,
  `work_country` varchar(100) DEFAULT NULL,
  `notifications_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `date_format` enum('DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD') DEFAULT 'DD/MM/YYYY',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_consular_users_email` (`email`),
  KEY `idx_consular_users_role` (`role`),
  KEY `idx_consular_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `auth_refresh_tokens` (
  `id` varchar(40) NOT NULL,
  `user_id` varchar(20) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `replaced_by_token_id` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_refresh_tokens_hash` (`token_hash`),
  KEY `idx_auth_refresh_tokens_user` (`user_id`),
  KEY `idx_auth_refresh_tokens_expiry` (`expires_at`),
  CONSTRAINT `fk_auth_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `consular_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- COMPLAINT TABLES
-- ------------------------------------------------------------
CREATE TABLE `complain_catagory` (
  `category_id` varchar(30) DEFAULT NULL,
  `category_name` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `complain_comments` (
  `complain_id` varchar(30) DEFAULT NULL,
  `complain_msg` varchar(1000) DEFAULT NULL,
  `updated_user` varchar(30) DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `complain_details` (
  `complain_id` varchar(30) DEFAULT NULL,
  `complain_type` varchar(30) DEFAULT NULL,
  `complain_user` varchar(30) DEFAULT NULL,
  `behalf_user` varchar(30) DEFAULT NULL,
  `mobile_no` varchar(500) DEFAULT NULL,
  `passport_no` varchar(30) DEFAULT NULL,
  `nic_no` varchar(30) DEFAULT NULL,
  `work_country` varchar(30) DEFAULT NULL,
  `description` varchar(300) DEFAULT NULL,
  `reported_time` datetime DEFAULT NULL,
  `complain_catagory` varchar(50) DEFAULT NULL,
  `resolution_catagory` varchar(150) DEFAULT NULL,
  `complain_status` varchar(30) DEFAULT NULL,
  `complain_handle` varchar(30) DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL,
  `updated_user` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `complain_logs` (
  `complain_id` varchar(30) DEFAULT NULL,
  `complain_msg` varchar(100) DEFAULT NULL,
  `updated_user` varchar(30) DEFAULT NULL,
  `updated_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `complaint_audit_events` (
  `id` varchar(30) NOT NULL,
  `complaint_id` varchar(30) NOT NULL,
  `event_type` varchar(40) NOT NULL,
  `actor_user_id` varchar(20) DEFAULT NULL,
  `actor_name` varchar(150) DEFAULT NULL,
  `actor_role` varchar(30) DEFAULT NULL,
  `previous_status` varchar(30) DEFAULT NULL,
  `new_status` varchar(30) DEFAULT NULL,
  `previous_assignee_user_id` varchar(20) DEFAULT NULL,
  `previous_assignee_name` varchar(150) DEFAULT NULL,
  `new_assignee_user_id` varchar(20) DEFAULT NULL,
  `new_assignee_name` varchar(150) DEFAULT NULL,
  `note_id` varchar(30) DEFAULT NULL,
  `note_type` varchar(30) DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complaint_audit_complaint_created` (`complaint_id`,`created_at`),
  KEY `idx_complaint_audit_actor_created` (`actor_user_id`,`created_at`),
  KEY `idx_complaint_audit_event_type` (`event_type`),
  CONSTRAINT `fk_complaint_audit_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `consular_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `migrant_employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fname` varchar(50) DEFAULT NULL,
  `lname` varchar(50) DEFAULT NULL,
  `nic` varchar(20) DEFAULT NULL,
  `passport` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `empcountry` varchar(50) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `pwdhash` varchar(255) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `create_date` datetime DEFAULT NULL,
  `modify_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_username` (`username`),
  UNIQUE KEY `unique_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `resolution_catagory` (
  `category_id` varchar(30) DEFAULT NULL,
  `category_name` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- SUPPORT TABLES
-- ------------------------------------------------------------
CREATE TABLE `complaint_assignments` (
  `complaint_id` varchar(30) NOT NULL,
  `assigned_to_user_id` varchar(20) NOT NULL,
  `assigned_by_user_id` varchar(20) DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  KEY `idx_assignments_user` (`assigned_to_user_id`),
  KEY `idx_assignments_assigned_at` (`assigned_at`),
  CONSTRAINT `fk_assignments_user` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `consular_users` (`id`),
  CONSTRAINT `fk_assignments_by_user` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `consular_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `complaint_attachments` (
  `id` varchar(20) NOT NULL,
  `complaint_id` varchar(30) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `file_size` bigint unsigned NOT NULL,
  `storage_url` varchar(500) NOT NULL,
  `uploaded_by_user_id` varchar(20) DEFAULT NULL,
  `uploaded_by_name` varchar(150) NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attachments_complaint` (`complaint_id`),
  KEY `idx_attachments_uploaded_at` (`uploaded_at`),
  CONSTRAINT `fk_attachments_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `consular_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notifications` (
  `id` varchar(20) NOT NULL,
  `recipient_user_id` varchar(20) NOT NULL,
  `notification_type` enum('CASE_UPDATE','SYSTEM_ALERT','MENTION','ASSIGNMENT') NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `link_url` varchar(255) DEFAULT NULL,
  `related_complaint_id` varchar(30) DEFAULT NULL,
  `complaint_id` varchar(30) GENERATED ALWAYS AS (`related_complaint_id`) VIRTUAL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif_recipient` (`recipient_user_id`),
  KEY `idx_notif_is_read` (`is_read`),
  KEY `idx_notif_recipient_read_date` (`recipient_user_id`,`is_read`,`created_at`),
  CONSTRAINT `fk_notif_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `consular_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- USER SEED DATA
-- Supervisor password: Admin@1234
-- Case Officer password: Officer@1234
-- ------------------------------------------------------------
INSERT INTO `consular_users` (
  `id`,
  `name`,
  `email`,
  `password_hash`,
  `role`,
  `phone`,
  `location`,
  `work_country`,
  `is_active`,
  `created_at`,
  `updated_at`
) VALUES (
  'USR001',
  'Admin Supervisor',
  'admin@slbfe.gov.lk',
  '$2a$10$FzsurGkx3XTKzpFxLLw1Qe5iJhYe8XYh8RmNSeFc7d0/oL588NiVq',
  'SUPERVISOR',
  '+94 11 000 0000',
  'Colombo',
  'Sri Lanka',
  1,
  NOW(),
  NOW()
), (
  'USR002',
  'Iman Fernando',
  'officer@slbfe.gov.lk',
  '$2a$10$.EB6SqAjGcfhd6UM14RTBOtW0zTBwPToRISjSyXX9/4s3KlvT2Jde',
  'CASE_OFFICER',
  '+94 77 234 5678',
  'Colombo',
  'Sri Lanka',
  1,
  NOW(),
  NOW()
);

-- ------------------------------------------------------------
-- LOOKUP SEED DATA
-- ------------------------------------------------------------
INSERT INTO `complain_catagory` (`category_id`, `category_name`) VALUES
  ('BREACH_OF_CONTRACT', 'Breach of Employment Contract'),
  ('HARASSMENT', 'Harassment'),
  ('LACK_OF_COMMUNICATION', 'Lack of Communication'),
  ('SICK', 'Sick'),
  ('BEING_JAILED', 'Being Jailed'),
  ('BEING_REMANDED_BY_POLICE', 'Being Remanded by Police'),
  ('BEING_STRANDED', 'Being Stranded without Employment'),
  ('PROBLEMS_AT_HOME', 'Problems at Employee''s Home (Sri Lanka)'),
  ('DEATH', 'Death'),
  ('BEING_RETAINED', 'Being Retained by Unknown Person'),
  ('SOS', 'SOS'),
  ('OTHER', 'Other');

INSERT INTO `resolution_catagory` (`category_id`, `category_name`) VALUES
  ('RESOLVED', 'Resolved'),
  ('CLOSED', 'Closed'),
  ('REFERRED_TO_MISSION', 'Referred to Mission'),
  ('REFERRED_TO_AGENCY', 'Referred to Recruitment Agency'),
  ('EMPLOYER_CONTACTED', 'Employer Contacted'),
  ('WORKER_UPDATED', 'Worker Updated');

-- ------------------------------------------------------------
-- MIGRANT EMPLOYEE SEED DATA
-- Password: Worker@1234
-- ------------------------------------------------------------
INSERT INTO `migrant_employees` (
  `fname`,
  `lname`,
  `nic`,
  `passport`,
  `mobile`,
  `empcountry`,
  `username`,
  `pwdhash`,
  `email`,
  `create_date`,
  `modify_date`
) VALUES (
  'Saman Chathuranga',
  'Perera',
  '199234567890',
  'N7684521',
  '+96566234198',
  'Kuwait',
  'saman.perera',
  '$2a$10$grcCwzAB0uJKkZ7dQfJvMOoufyJaAz.COAERwQtrcxJyRhD1.dB4a',
  'saman.perera@example.com',
  NOW(),
  NOW()
), (
  'Tharindu Lakmal',
  'Silva',
  '198765432145',
  'OL5432189',
  '+966558732104',
  'Saudi Arabia',
  'tharindu.silva',
  '$2a$10$grcCwzAB0uJKkZ7dQfJvMOoufyJaAz.COAERwQtrcxJyRhD1.dB4a',
  'tharindu.silva@example.com',
  NOW(),
  NOW()
), (
  'Nadeesha Kumari',
  'Jayawardena',
  '199678901234',
  'P9843216',
  '+971551183624',
  'United Arab Emirates',
  'nadeesha.jayawardena',
  '$2a$10$grcCwzAB0uJKkZ7dQfJvMOoufyJaAz.COAERwQtrcxJyRhD1.dB4a',
  'nadeesha.jayawardena@example.com',
  NOW(),
  NOW()
), (
  'Kasun Madushanka',
  'Ranasinghe',
  '199045612378',
  'N5439872',
  '+97466554821',
  'Qatar',
  'kasun.ranasinghe',
  '$2a$10$grcCwzAB0uJKkZ7dQfJvMOoufyJaAz.COAERwQtrcxJyRhD1.dB4a',
  'kasun.ranasinghe@example.com',
  NOW(),
  NOW()
), (
  'Saman',
  'Ekanayake',
  '763453218V',
  'N1234',
  '893456',
  'Qatar',
  'N1234',
  '81dc9bdb52d04dc20036dbd8313ed055',
  'aa@gmail',
  NOW(),
  NOW()
);

-- ------------------------------------------------------------
-- COMPLAINT SEED DATA
-- ------------------------------------------------------------
INSERT INTO `complain_details` (
  `complain_id`,
  `complain_type`,
  `complain_user`,
  `behalf_user`,
  `mobile_no`,
  `passport_no`,
  `nic_no`,
  `work_country`,
  `description`,
  `reported_time`,
  `complain_catagory`,
  `resolution_catagory`,
  `complain_status`,
  `complain_handle`,
  `updated_time`,
  `updated_user`
) VALUES (
  'C001',
  'BREACH_OF_CONTRACT',
  'Saman Chathuranga Perera',
  NULL,
  '+965 66234198',
  'N7684521',
  '199234567890',
  'Kuwait',
  'Worker reported unpaid salary, forced overtime, and passport retention by the employer.',
  '2026-04-18 08:40:00',
  'BREACH_OF_CONTRACT',
  'Recover unpaid salary and return passport',
  'In Progress',
  'CONSULAR',
  '2026-04-21 11:10:00',
  'USR002'
), (
  'C002',
  'LACK_OF_COMMUNICATION',
  'Tharindu Lakmal Silva',
  NULL,
  '+966 558732104',
  'OL5432189',
  '198765432145',
  'Riyadh',
  'Worker requested assistance with annual leave and employer pressure to sign a settlement paper.',
  '2026-04-17 19:25:00',
  'LACK_OF_COMMUNICATION',
  'Approve emergency leave or provide a fair settlement',
  'Awaiting Info',
  'CONSULAR',
  '2026-04-20 14:05:00',
  'USR002'
), (
  'C003',
  'BEING_RETAINED',
  'Nadeesha Kumari Jayawardena',
  NULL,
  '+971 551183624',
  'P9843216',
  '199678901234',
  'Dubai',
  'Worker reported passport retention, restricted communication, and physical intimidation.',
  '2026-04-16 06:50:00',
  'BEING_RETAINED',
  'Move worker to safety and restore family contact',
  'In Progress',
  'CONSULAR',
  '2026-04-19 09:40:00',
  'USR001'
), (
  'C004',
  'BREACH_OF_CONTRACT',
  'Kasun Madushanka Ranasinghe',
  NULL,
  '+974 66554821',
  'N5439872',
  '199045612378',
  'Doha',
  'Worker reported unsafe heat exposure and threats after raising concerns at the work site.',
  '2026-04-10 12:15:00',
  'BREACH_OF_CONTRACT',
  'Ensure safe work conditions and stop employer threats',
  'Resolved',
  'SLBFE',
  '2026-04-15 17:20:00',
  'USR002'
), (
  'C005',
  'OTHER',
  'Malith Priyankara',
  NULL,
  '+968 91234567',
  'M8765432',
  '199112345678',
  'Muscat',
  'Worker requested guidance before signing a final salary settlement paper.',
  '2026-04-22 09:05:00',
  'OTHER',
  'Explain final salary rights before signing settlement',
  'Submitted',
  'CONSULAR',
  '2026-04-22 09:05:00',
  NULL
), (
  'C006',
  'SICK',
  'Dilini Apsara',
  NULL,
  '+973 33124567',
  'D6543218',
  '199556789012',
  'Manama',
  'Worker requested help contacting the sponsor to obtain medical attention.',
  '2026-04-22 10:30:00',
  'SICK',
  'Arrange medical care through the sponsor',
  'Under Review',
  'CONSULAR',
  '2026-04-22 11:00:00',
  'USR001'
), (
  'C007',
  'BEING_STRANDED',
  'Ruwan Lakmal',
  NULL,
  '+974 55112233',
  'R3344556',
  '198812349876',
  'Doha',
  'Worker reported being stranded after the agency stopped responding to calls.',
  '2026-04-08 13:45:00',
  'BEING_STRANDED',
  'Arrange safe accommodation and return travel',
  'Closed',
  'CONSULAR',
  '2026-04-18 15:30:00',
  'USR001'
), (
  'C008',
  'HARASSMENT',
  'Saman Ekanayake',
  'Nadeesha Kumari Jayawardena',
  '+971 551183624',
  'P9843216',
  '199678901234',
  'Dubai',
  'Submitted by Saman Ekanayake on behalf of Nadeesha Kumari Jayawardena for harassment support and consular intervention.',
  '2026-05-06 12:30:00',
  'HARASSMENT',
  'Ensure worker safety and stop workplace harassment',
  'Under Review',
  'CONSULAR',
  '2026-05-06 12:30:00',
  'N1234'
), (
  'C009',
  'PROBLEMS_AT_HOME',
  'Pradeep Nishantha',
  NULL,
  '+968 92345678',
  'M2233445',
  '198934561234',
  'Muscat',
  'Worker requested help after family members in Sri Lanka reported an urgent welfare concern.',
  '2026-05-05 09:15:00',
  'PROBLEMS_AT_HOME',
  'Help family resolve urgent welfare issue in Sri Lanka',
  'Awaiting Info',
  'CONSULAR',
  '2026-05-05 14:20:00',
  'USR002'
), (
  'C010',
  'BEING_JAILED',
  'Lahiru Madusanka',
  NULL,
  '+974 55667788',
  'Q9988776',
  '199145678901',
  'Doha',
  'Family reported the worker was detained after a workplace dispute and requested mission assistance.',
  '2026-05-04 16:05:00',
  'BEING_JAILED',
  'Confirm detention location and provide legal support',
  'Under Review',
  'CONSULAR',
  '2026-05-04 16:45:00',
  'USR001'
), (
  'C011',
  'DEATH',
  'Anusha Priyadarshani',
  NULL,
  '+965 60112233',
  'K5566778',
  '198756789012',
  'Kuwait',
  'Relative requested urgent consular support after receiving notice of the worker death abroad.',
  '2026-05-03 07:30:00',
  'DEATH',
  'Assist family with repatriation and documentation',
  'In Progress',
  'CONSULAR',
  '2026-05-03 10:10:00',
  'USR001'
), (
  'C012',
  'BREACH_OF_CONTRACT',
  'Roshan Kumara',
  NULL,
  '+973 39876543',
  'B6677889',
  '199023456789',
  'Manama',
  'Worker reported contract substitution, delayed salary, and pressure to accept different duties.',
  '2026-05-02 18:25:00',
  'BREACH_OF_CONTRACT',
  'Restore original contract terms and unpaid salary',
  'Under Review',
  'CONSULAR',
  '2026-05-02 19:00:00',
  'USR001'
), (
  'C013',
  'OTHER',
  'Nirmala Fernando',
  NULL,
  '+6591234567',
  'S3344556',
  '199567890123',
  'Singapore',
  'Worker requested guidance about renewing documents before returning to the employer.',
  '2026-05-01 11:10:00',
  'OTHER',
  'Advise on document renewal before returning to work',
  'Submitted',
  'CONSULAR',
  '2026-05-01 11:10:00',
  NULL
), (
  'C014',
  'LACK_OF_COMMUNICATION',
  'Hashan Perera',
  NULL,
  '+966 501234567',
  'R7788990',
  '198645678901',
  'Riyadh',
  'Worker could not contact the local agency after the employer stopped responding about leave approval.',
  '2026-04-30 08:50:00',
  'LACK_OF_COMMUNICATION',
  'Get a written response from agency about leave approval',
  'Resolved',
  'CONSULAR',
  '2026-05-04 12:40:00',
  'USR002'
);

INSERT INTO `complaint_assignments` (
  `complaint_id`,
  `assigned_to_user_id`,
  `assigned_by_user_id`,
  `assigned_at`,
  `updated_at`
) VALUES (
  'C001',
  'USR002',
  'USR001',
  '2026-04-18 10:15:00',
  '2026-04-18 10:15:00'
), (
  'C002',
  'USR002',
  'USR001',
  '2026-04-18 10:20:00',
  '2026-04-18 10:20:00'
), (
  'C003',
  'USR002',
  'USR001',
  '2026-04-19 09:30:00',
  '2026-04-19 09:30:00'
), (
  'C004',
  'USR002',
  'USR001',
  '2026-04-11 09:00:00',
  '2026-04-11 09:00:00'
), (
  'C006',
  'USR002',
  'USR001',
  '2026-04-22 11:00:00',
  '2026-04-22 11:00:00'
), (
  'C007',
  'USR002',
  'USR001',
  '2026-04-08 14:10:00',
  '2026-04-08 14:10:00'
), (
  'C008',
  'USR002',
  'USR001',
  '2026-05-06 12:35:00',
  '2026-05-06 12:35:00'
), (
  'C009',
  'USR002',
  'USR001',
  '2026-05-05 09:45:00',
  '2026-05-05 09:45:00'
), (
  'C010',
  'USR002',
  'USR001',
  '2026-05-04 16:45:00',
  '2026-05-04 16:45:00'
), (
  'C011',
  'USR002',
  'USR001',
  '2026-05-03 08:00:00',
  '2026-05-03 08:00:00'
), (
  'C012',
  'USR002',
  'USR001',
  '2026-05-02 19:00:00',
  '2026-05-02 19:00:00'
), (
  'C014',
  'USR002',
  'USR001',
  '2026-04-30 09:20:00',
  '2026-04-30 09:20:00'
);

INSERT INTO `complaint_attachments` (
  `id`,
  `complaint_id`,
  `file_name`,
  `file_type`,
  `file_size`,
  `storage_url`,
  `uploaded_by_user_id`,
  `uploaded_by_name`,
  `uploaded_at`
) VALUES (
  'ATT-C006-IMG',
  'C006',
  'C006-medical-photo.png',
  'image/png',
  694428,
  'assets/Emblem_of_Sri_Lanka.png',
  NULL,
  'Flutter Mobile App',
  '2026-04-22 10:35:00'
), (
  'ATT-C006-PDF',
  'C006',
  'C006-medical-request.pdf',
  'application/pdf',
  952,
  'assets/demo-attachments/C006-medical-request.pdf',
  NULL,
  'Flutter Mobile App',
  '2026-04-22 10:36:00'
);

INSERT INTO `complain_comments` (`complain_id`, `complain_msg`, `updated_user`, `updated_time`) VALUES
  (
    'C001',
    'I have not received my salary for the last three months. My employer is also forcing me to work overtime without payment and my passport has been kept in the office. I am unable to leave the work site or change my job because they are refusing to return my passport.',
    NULL,
    '2026-04-18 08:40:00'
  ),
  (
    'C001',
    'Employer contact details were verified. Salary slips received from the worker will be checked with the recruiting agency before formal employer outreach.',
    'USR002',
    '2026-04-21 11:30:00'
  ),
  (
    'C002',
    'I came to Saudi Arabia nearly two years ago and my company has not given me any annual leave even though it is mentioned in my contract. When I asked for leave to come home because my mother is sick, the supervisor said I can go only if I buy my own ticket and sign a paper saying I have no claims.',
    NULL,
    '2026-04-17 19:25:00'
  ),
  (
    'C002',
    'Waiting for a clearer copy of the passport bio page and employer contact number before proceeding through Riyadh mission channels.',
    'USR002',
    '2026-04-20 14:20:00'
  ),
  (
    'C003',
    'I am working as a housemaid in Dubai. Madam has taken my passport and phone and does not allow me to contact my family freely. I am shouted at daily and I have not been allowed to leave the house alone. Last week I was pushed during an argument and I am now scared to stay here. Please help me urgently.',
    NULL,
    '2026-04-16 06:50:00'
  ),
  (
    'C003',
    'Risk indicators are high. Supervisor instructed immediate coordination with the Dubai mission because the complaint includes confinement and physical intimidation.',
    'USR001',
    '2026-04-19 10:05:00'
  ),
  (
    'C004',
    'I am working in a construction company in Doha. For the last several weeks we have been taken to work in the afternoon heat without proper drinking water or safety equipment. Two workers fainted on site. After I complained, the site supervisor threatened to send me back to Sri Lanka.',
    NULL,
    '2026-04-10 12:15:00'
  ),
  (
    'C004',
    'Worker confirmed improved site conditions and no further threats from the supervisor. Case can be closed if there are no further complaints within a week.',
    'USR002',
    '2026-04-15 16:10:00'
  ),
  (
    'C005',
    'I submitted this through the mobile app today. My employer has delayed my final salary and I need guidance before I sign any settlement paper.',
    NULL,
    '2026-04-22 09:05:00'
  ),
  (
    'C006',
    'I am unwell and need help contacting the sponsor because I have not been taken to a doctor despite repeated requests.',
    NULL,
    '2026-04-22 10:30:00'
  ),
  (
    'C006',
    'Assigned case is being reviewed. Medical details and employer contact information will be verified before active intervention starts.',
    'USR002',
    '2026-04-22 11:05:00'
  ),
  (
    'C007',
    'I was stranded after the agency stopped answering calls. I had no clear accommodation or return plan and asked for urgent assistance.',
    NULL,
    '2026-04-08 13:45:00'
  ),
  (
    'C007',
    'Return travel support was completed, worker confirmed safe arrival, and the case was closed by the supervisor.',
    'USR001',
    '2026-04-18 15:30:00'
  ),
  (
    'C008',
    'Complainant submitted this on behalf of the worker from the mobile app.',
    NULL,
    '2026-05-06 12:31:00'
  ),
  (
    'C008',
    'Assigned consular-path case is ready for review. Use SLBFE Transfer only if the handling path should move to SLBFE.',
    'USR002',
    '2026-05-06 12:40:00'
  ),
  (
    'C009',
    'My family needs help with a welfare issue at home and I cannot reach the correct office while overseas.',
    NULL,
    '2026-05-05 09:15:00'
  ),
  (
    'C009',
    'Requested supporting documents and local contact details before coordinating welfare assistance.',
    'USR002',
    '2026-05-05 14:20:00'
  ),
  (
    'C010',
    'The family reported detention and asked for urgent help confirming the worker location.',
    NULL,
    '2026-05-04 16:05:00'
  ),
  (
    'C010',
    'Initial detention details were recorded. Officer will coordinate through mission channels.',
    'USR002',
    '2026-05-04 16:55:00'
  ),
  (
    'C011',
    'Relative requested assistance with death notification, documentation, and next steps for repatriation.',
    NULL,
    '2026-05-03 07:30:00'
  ),
  (
    'C011',
    'Priority handling started. Mission contact and family representative details were verified.',
    'USR002',
    '2026-05-03 10:15:00'
  ),
  (
    'C012',
    'My contract was changed after arrival and I have not received the salary amount promised before departure.',
    NULL,
    '2026-05-02 18:25:00'
  ),
  (
    'C012',
    'Assigned for contract review. Awaiting copies of agreement and recent salary records.',
    'USR002',
    '2026-05-02 19:10:00'
  ),
  (
    'C013',
    'I need advice about document renewal before I return to my employer next month.',
    NULL,
    '2026-05-01 11:10:00'
  ),
  (
    'C014',
    'The agency stopped answering calls and my leave approval has been pending for several weeks.',
    NULL,
    '2026-04-30 08:50:00'
  ),
  (
    'C014',
    'Agency confirmed the leave approval timeline and worker accepted the written response.',
    'USR002',
    '2026-05-04 12:35:00'
  );

INSERT INTO `complain_logs` (`complain_id`, `complain_msg`, `updated_user`, `updated_time`) VALUES
  ('C001', 'Assigned to Iman Fernando', 'USR001', '2026-04-18 10:15:00'),
  ('C001', 'Status Changed: In Progress', 'USR002', '2026-04-21 11:10:00'),
  ('C002', 'Assigned to Iman Fernando', 'USR001', '2026-04-18 10:20:00'),
  ('C002', 'Status Changed: Awaiting Info', 'USR002', '2026-04-20 14:05:00'),
  ('C003', 'Assigned to Iman Fernando', 'USR001', '2026-04-19 09:30:00'),
  ('C003', 'Status Changed: In Progress', 'USR001', '2026-04-19 09:40:00'),
  ('C004', 'Assigned to Iman Fernando', 'USR001', '2026-04-11 09:00:00'),
  ('C004', 'Status Changed: Resolved', 'USR002', '2026-04-15 17:20:00'),
  ('C006', 'Assigned to Iman Fernando', 'USR001', '2026-04-22 11:00:00'),
  ('C007', 'Assigned to Iman Fernando', 'USR001', '2026-04-08 14:10:00'),
  ('C007', 'Status Changed: In Progress', 'USR002', '2026-04-09 08:45:00'),
  ('C007', 'Status Changed: Resolved', 'USR002', '2026-04-17 16:20:00'),
  ('C007', 'Status Changed: Closed', 'USR001', '2026-04-18 15:30:00'),
  ('C008', 'Assigned to Iman Fernando', 'USR001', '2026-05-06 12:35:00'),
  ('C009', 'Assigned to Iman Fernando', 'USR001', '2026-05-05 09:45:00'),
  ('C009', 'Status Changed: Awaiting Info', 'USR002', '2026-05-05 14:20:00'),
  ('C010', 'Assigned to Iman Fernando', 'USR001', '2026-05-04 16:45:00'),
  ('C011', 'Assigned to Iman Fernando', 'USR001', '2026-05-03 08:00:00'),
  ('C011', 'Status Changed: In Progress', 'USR002', '2026-05-03 10:10:00'),
  ('C012', 'Assigned to Iman Fernando', 'USR001', '2026-05-02 19:00:00'),
  ('C014', 'Assigned to Iman Fernando', 'USR001', '2026-04-30 09:20:00'),
  ('C014', 'Status Changed: Resolved', 'USR002', '2026-05-04 12:40:00');

INSERT INTO `complaint_audit_events` (
  `id`,
  `complaint_id`,
  `event_type`,
  `actor_user_id`,
  `actor_name`,
  `actor_role`,
  `previous_status`,
  `new_status`,
  `previous_assignee_user_id`,
  `previous_assignee_name`,
  `new_assignee_user_id`,
  `new_assignee_name`,
  `metadata_json`,
  `created_at`
) VALUES
  ('AUD001', 'C001', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-04-18 10:15:00'),
  ('AUD002', 'C001', 'STATUS_CHANGED', 'USR002', 'Iman Fernando', 'CASE_OFFICER', 'Under Review', 'In Progress', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE), '2026-04-21 11:10:00'),
  ('AUD003', 'C002', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-04-18 10:20:00'),
  ('AUD004', 'C002', 'STATUS_CHANGED', 'USR002', 'Iman Fernando', 'CASE_OFFICER', 'Under Review', 'Awaiting Info', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE, 'noteAdded', TRUE), '2026-04-20 14:05:00'),
  ('AUD005', 'C003', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-04-19 09:30:00'),
  ('AUD006', 'C003', 'STATUS_CHANGED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Under Review', 'In Progress', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE, 'urgent', TRUE), '2026-04-19 09:40:00'),
  ('AUD007', 'C004', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-04-11 09:00:00'),
  ('AUD008', 'C004', 'STATUS_CHANGED', 'USR002', 'Iman Fernando', 'CASE_OFFICER', 'In Progress', 'Resolved', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE), '2026-04-15 17:20:00'),
  ('AUD009', 'C006', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-04-22 11:00:00'),
  ('AUD010', 'C007', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-04-08 14:10:00'),
  ('AUD011', 'C007', 'STATUS_CHANGED', 'USR002', 'Iman Fernando', 'CASE_OFFICER', 'Under Review', 'In Progress', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE), '2026-04-09 08:45:00'),
  ('AUD012', 'C007', 'STATUS_CHANGED', 'USR002', 'Iman Fernando', 'CASE_OFFICER', 'In Progress', 'Resolved', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE), '2026-04-17 16:20:00'),
  ('AUD013', 'C007', 'STATUS_CHANGED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Resolved', 'Closed', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE), '2026-04-18 15:30:00'),
  ('AUD014', 'C008', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE, 'onBehalf', TRUE), '2026-05-06 12:35:00'),
  ('AUD015', 'C009', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-05-05 09:45:00'),
  ('AUD016', 'C009', 'STATUS_CHANGED', 'USR002', 'Iman Fernando', 'CASE_OFFICER', 'Under Review', 'Awaiting Info', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE, 'noteAdded', TRUE), '2026-05-05 14:20:00'),
  ('AUD017', 'C010', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE, 'urgent', TRUE), '2026-05-04 16:45:00'),
  ('AUD018', 'C011', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE, 'priority', 'critical'), '2026-05-03 08:00:00'),
  ('AUD019', 'C011', 'STATUS_CHANGED', 'USR002', 'Iman Fernando', 'CASE_OFFICER', 'Under Review', 'In Progress', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE), '2026-05-03 10:10:00'),
  ('AUD020', 'C012', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-05-02 19:00:00'),
  ('AUD021', 'C014', 'ASSIGNED', 'USR001', 'Admin Supervisor', 'SUPERVISOR', 'Submitted', 'Under Review', NULL, NULL, 'USR002', 'Iman Fernando', JSON_OBJECT('seeded', TRUE), '2026-04-30 09:20:00'),
  ('AUD022', 'C014', 'STATUS_CHANGED', 'USR002', 'Iman Fernando', 'CASE_OFFICER', 'Under Review', 'Resolved', NULL, NULL, NULL, NULL, JSON_OBJECT('seeded', TRUE), '2026-05-04 12:40:00');

INSERT INTO `notifications` (
  `id`,
  `recipient_user_id`,
  `notification_type`,
  `title`,
  `message`,
  `is_read`,
  `link_url`,
  `related_complaint_id`,
  `created_at`,
  `deleted_at`
) VALUES (
  'NTF001',
  'USR001',
  'CASE_UPDATE',
  'Case C001 Updated',
  'Status changed to In Progress for complaint C001.',
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
  'Case C001 has been assigned to you.',
  0,
  '/complaints/C001',
  'C001',
  '2026-04-18 10:15:00',
  NULL
), (
  'NTF003',
  'USR002',
  'CASE_UPDATE',
  'Case C004 Updated',
  'Status changed to Resolved for complaint C004.',
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
  'Complaint C003 was moved to In Progress for urgent intervention.',
  0,
  '/complaints/C003',
  'C003',
  '2026-04-19 09:45:00',
  NULL
), (
  'NTF005',
  'USR002',
  'ASSIGNMENT',
  'New Case Under Review',
  'Case C006 has been assigned to you and is now under review.',
  0,
  '/complaints/C006',
  'C006',
  '2026-04-22 11:00:00',
  NULL
), (
  'NTF006',
  'USR002',
  'CASE_UPDATE',
  'Case C007 Closed',
  'Complaint C007 was closed after resolution confirmation.',
  1,
  '/complaints/C007',
  'C007',
  '2026-04-18 15:35:00',
  NULL
), (
  'NTF007',
  'USR002',
  'ASSIGNMENT',
  'New On-Behalf Case Assigned',
  'Case C008 has been assigned to you on the Consular path.',
  0,
  '/complaints/C008',
  'C008',
  '2026-05-06 12:35:00',
  NULL
);
