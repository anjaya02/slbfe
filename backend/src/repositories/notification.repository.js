const { query } = require("../config/db");

function mapNotificationRow(row) {
  return {
    id: row.id,
    type: row.notification_type,
    title: row.title,
    message: row.message,
    read: Boolean(row.is_read),
    timestamp: row.created_at,
    link: row.link_url,
    relatedComplaintId: row.related_complaint_id,
  };
}

async function listNotifications(userId, filter = "all") {
  const params = { userId };
  let unreadClause = "";

  if (filter === "unread") {
    unreadClause = "AND is_read = 0";
  }

  const rows = await query(
    `
      SELECT *
      FROM notifications
      WHERE recipient_user_id = :userId
        AND deleted_at IS NULL
        ${unreadClause}
      ORDER BY created_at DESC
    `,
    params,
  );

  return rows.map(mapNotificationRow);
}

async function createNotification(notification) {
  await query(
    `
      INSERT INTO notifications (
        id,
        recipient_user_id,
        notification_type,
        title,
        message,
        is_read,
        link_url,
        related_complaint_id
      ) VALUES (
        :id,
        :recipientUserId,
        :notificationType,
        :title,
        :message,
        :isRead,
        :linkUrl,
        :relatedComplaintId
      )
    `,
    notification,
  );
}

async function markAsRead(userId, id) {
  return query(
    `
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = :id AND recipient_user_id = :userId AND deleted_at IS NULL
    `,
    { id, userId },
  );
}

async function markAllAsRead(userId) {
  await query(
    `
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE recipient_user_id = :userId AND deleted_at IS NULL
    `,
    { userId },
  );
}

async function deleteNotification(userId, id) {
  return query(
    `
      UPDATE notifications
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = :id AND recipient_user_id = :userId AND deleted_at IS NULL
    `,
    { id, userId },
  );
}

async function clearNotifications(userId) {
  await query(
    `
      UPDATE notifications
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE recipient_user_id = :userId AND deleted_at IS NULL
    `,
    { userId },
  );
}

module.exports = {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications,
};
