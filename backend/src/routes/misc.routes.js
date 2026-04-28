const express = require("express");

const complaintService = require("../services/complaint.service");
const notificationService = require("../services/notification.service");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const validateRequest = require("../middleware/validate-request.middleware");
const asyncHandler = require("../utils/async-handler");
const {
  idParamSchema,
  emptyBodySchema,
  reportGenerateBodySchema,
} = require("../validation/request-schemas");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/dashboard/stats",
  asyncHandler(async (req, res) => {
    const stats = await complaintService.getDashboardStats(req.user);
    res.json(stats);
  }),
);

router.post(
  "/reports/generate",
  requireRole("SUPERVISOR"),
  validateRequest({ body: reportGenerateBodySchema }),
  asyncHandler(async (req, res) => {
    const report = await complaintService.generateReport(req.body);
    res.json(report);
  }),
);

router.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const notifications = await notificationService.getNotifications(
      req.user.id,
      req.query.filter || "all",
    );
    res.json(notifications);
  }),
);

router.patch(
  "/notifications/:id/read",
  validateRequest({ params: idParamSchema, body: emptyBodySchema }),
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAsRead(
      req.user.id,
      req.params.id,
    );
    res.json(result);
  }),
);

router.patch(
  "/notifications/read-all",
  validateRequest({ body: emptyBodySchema }),
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json(result);
  }),
);

router.delete(
  "/notifications/:id",
  validateRequest({ params: idParamSchema, body: emptyBodySchema }),
  asyncHandler(async (req, res) => {
    const result = await notificationService.deleteNotification(
      req.user.id,
      req.params.id,
    );
    res.json(result);
  }),
);

router.delete(
  "/notifications",
  validateRequest({ body: emptyBodySchema }),
  asyncHandler(async (req, res) => {
    const result = await notificationService.clearNotifications(req.user.id);
    res.json(result);
  }),
);

module.exports = router;
