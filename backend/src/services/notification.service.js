const notificationRepository = require("../repositories/notification.repository");
const AppError = require("../utils/app-error");
const { generateId } = require("../utils/id");

async function getNotifications(userId, filter) {
  return notificationRepository.listNotifications(userId, filter);
}

async function getUnreadCount(userId) {
  const count = await notificationRepository.getUnreadCount(userId);
  return { count };
}

async function markAsRead(userId, notificationId) {
  const result = await notificationRepository.markAsRead(
    userId,
    notificationId,
  );

  if (!result.affectedRows) {
    throw new AppError(404, "Notification not found");
  }

  return { success: true };
}

async function markAllAsRead(userId) {
  await notificationRepository.markAllAsRead(userId);
  return { success: true };
}

async function deleteNotification(userId, notificationId) {
  const result = await notificationRepository.deleteNotification(
    userId,
    notificationId,
  );

  if (!result.affectedRows) {
    throw new AppError(404, "Notification not found");
  }

  return { success: true };
}

async function clearNotifications(userId) {
  await notificationRepository.clearNotifications(userId);
  return { success: true };
}

async function createAssignmentNotification({
  recipientUserId,
  complaintId,
  referenceNo,
}) {
  await notificationRepository.createNotification({
    id: generateId("NTF"),
    recipientUserId,
    notificationType: "ASSIGNMENT",
    title: "New Case Assigned",
    message: `Case ${referenceNo} has been assigned to you.`,
    isRead: 0,
    linkUrl: `/complaints/${complaintId}`,
    relatedComplaintId: complaintId,
  });
}

async function createStatusNotification({
  recipientUserId,
  complaintId,
  referenceNo,
  status,
}) {
  await notificationRepository.createNotification({
    id: generateId("NTF"),
    recipientUserId,
    notificationType: "CASE_UPDATE",
    title: `Case ${referenceNo} Updated`,
    message: `Status changed to ${status} for complaint ${referenceNo}.`,
    isRead: 0,
    linkUrl: `/complaints/${complaintId}`,
    relatedComplaintId: complaintId,
  });
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications,
  createAssignmentNotification,
  createStatusNotification,
};
