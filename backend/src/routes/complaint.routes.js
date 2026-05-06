const express = require("express");

const complaintService = require("../services/complaint.service");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { auditRequest } = require("../middleware/audit-log.middleware");
const validateRequest = require("../middleware/validate-request.middleware");
const asyncHandler = require("../utils/async-handler");
const {
  idParamSchema,
  complaintStatusBodySchema,
  complaintAssignmentBodySchema,
  complaintNoteBodySchema,
} = require("../validation/request-schemas");

const router = express.Router();

router.use(requireAuth);
router.use(auditRequest("COMPLAINT_API"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const response = await complaintService.getComplaints({
      actor: req.user,
      search: req.query.search,
      statuses: req.query.status
        ? String(req.query.status).split(",")
        : undefined,
      types: req.query.type ? String(req.query.type).split(",") : undefined,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      assignedTo: req.query.assignedTo,
      page: Number(req.query.page || 0),
      pageSize: Number(req.query.pageSize || 10),
      sortBy: req.query.sortBy,
      sortDirection: req.query.sortDirection,
    });
    res.json(response);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const complaint = await complaintService.getComplaintById(
      req.params.id,
      req.user,
    );
    res.json(complaint);
  }),
);

router.patch(
  "/:id/status",
  validateRequest({ params: idParamSchema, body: complaintStatusBodySchema }),
  asyncHandler(async (req, res) => {
    const complaint = await complaintService.updateComplaintStatus({
      complaintId: req.params.id,
      newStatus: req.body.newStatus,
      note: req.body.note,
      actor: req.user,
    });
    res.json(complaint);
  }),
);

router.patch(
  "/:id/assignment",
  requireRole("SUPERVISOR"),
  validateRequest({
    params: idParamSchema,
    body: complaintAssignmentBodySchema,
  }),
  asyncHandler(async (req, res) => {
    const complaint = await complaintService.assignComplaint({
      complaintId: req.params.id,
      officerId: req.body.officerId,
      note: req.body.note,
      actor: req.user,
    });
    res.json(complaint);
  }),
);

router.patch(
  "/:id/slbfe-transfer",
  validateRequest({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const complaint = await complaintService.transferToSlbfe({
      complaintId: req.params.id,
      actor: req.user,
    });
    res.json(complaint);
  }),
);

router.post(
  "/:id/notes",
  validateRequest({ params: idParamSchema, body: complaintNoteBodySchema }),
  asyncHandler(async (req, res) => {
    const note = await complaintService.addNote({
      complaintId: req.params.id,
      content: req.body.content,
      isInternal: Boolean(req.body.isInternal),
      actor: req.user,
    });
    res.status(201).json(note);
  }),
);

module.exports = router;
