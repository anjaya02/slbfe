const { query } = require("../config/db");

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar_url || "",
    phone: row.phone || "",
    location: row.location || "",
    workCountry: row.work_country || "",
    notificationsEnabled: Boolean(row.notifications_enabled),
    dateFormat: row.date_format || "DD/MM/YYYY",
    isActive: Boolean(row.is_active),
    dateCreated: row.created_at,
  };
}

async function findByEmail(email) {
  const rows = await query(
    `
      SELECT *
      FROM consular_users
      WHERE email = :email
      LIMIT 1
    `,
    { email },
  );

  return rows[0] || null;
}

async function findById(id) {
  const rows = await query(
    `
      SELECT *
      FROM consular_users
      WHERE id = :id
      LIMIT 1
    `,
    { id },
  );

  return rows[0] || null;
}

async function listUsers(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.role) {
    clauses.push("role = :role");
    params.role = filters.role;
  }

  if (typeof filters.active !== "undefined") {
    clauses.push("is_active = :active");
    params.active = Number(filters.active);
  }

  if (filters.search) {
    clauses.push("(name LIKE :search OR email LIKE :search)");
    params.search = `%${filters.search}%`;
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await query(
    `
      SELECT *
      FROM consular_users
      ${whereClause}
      ORDER BY created_at DESC
    `,
    params,
  );

  return rows.map(mapUserRow);
}

async function listCaseOfficers() {
  const rows = await query(
    `
      SELECT *
      FROM consular_users
      WHERE role = 'CASE_OFFICER' AND is_active = 1
      ORDER BY name ASC
    `,
  );

  return rows.map(mapUserRow);
}

async function createUser(user) {
  await query(
    `
      INSERT INTO consular_users (
        id,
        name,
        email,
        password_hash,
        role,
        avatar_url,
        phone,
        location,
        work_country,
        notifications_enabled,
        date_format,
        is_active
      ) VALUES (
        :id,
        :name,
        :email,
        :passwordHash,
        :role,
        :avatarUrl,
        :phone,
        :location,
        :workCountry,
        :notificationsEnabled,
        :dateFormat,
        :isActive
      )
    `,
    user,
  );

  return findById(user.id);
}

async function updateUser(id, updates) {
  const sets = [];
  const params = { id };

  Object.entries(updates).forEach(([key, value]) => {
    sets.push(`${key} = :${key}`);
    params[key] = value;
  });

  if (!sets.length) {
    return findById(id);
  }

  await query(
    `
      UPDATE consular_users
      SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `,
    params,
  );

  return findById(id);
}

async function updateLastLogin(id) {
  await query(
    `
      UPDATE consular_users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `,
    { id },
  );
}

module.exports = {
  mapUserRow,
  findByEmail,
  findById,
  listUsers,
  listCaseOfficers,
  createUser,
  updateUser,
  updateLastLogin,
};
