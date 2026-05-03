const crypto = require("crypto");

const { query } = require("../config/db");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createRefreshToken(record) {
  await query(
    `
      INSERT INTO auth_refresh_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        replaced_by_token_id
      ) VALUES (
        :id,
        :userId,
        :tokenHash,
        :expiresAt,
        :replacedByTokenId
      )
    `,
    record,
  );
}

async function findRefreshTokenByPlainToken(token) {
  const tokenHash = hashToken(token);
  const rows = await query(
    `
      SELECT *
      FROM auth_refresh_tokens
      WHERE token_hash = :tokenHash
      LIMIT 1
    `,
    { tokenHash },
  );

  return rows[0] || null;
}

async function revokeRefreshToken({ id, replacedByTokenId = null }) {
  await query(
    `
      UPDATE auth_refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP,
          replaced_by_token_id = COALESCE(:replacedByTokenId, replaced_by_token_id)
      WHERE id = :id
        AND revoked_at IS NULL
    `,
    { id, replacedByTokenId },
  );
}

async function revokeAllRefreshTokensForUser(userId) {
  await query(
    `
      UPDATE auth_refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = :userId
        AND revoked_at IS NULL
    `,
    { userId },
  );
}

async function deleteExpiredRefreshTokens() {
  await query(
    `
      DELETE FROM auth_refresh_tokens
      WHERE expires_at < CURRENT_TIMESTAMP
    `,
  );
}

module.exports = {
  hashToken,
  createRefreshToken,
  findRefreshTokenByPlainToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  deleteExpiredRefreshTokens,
};