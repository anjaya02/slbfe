const express = require("express");

const userService = require("../services/user.service");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const validateRequest = require("../middleware/validate-request.middleware");
const asyncHandler = require("../utils/async-handler");
const {
  idParamSchema,
  createUserBodySchema,
  updateUserBodySchema,
  updateUserStatusBodySchema,
} = require("../validation/request-schemas");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  requireRole("SUPERVISOR"),
  asyncHandler(async (req, res) => {
    const users = await userService.getUsers({
      role: req.query.role,
      active:
        typeof req.query.active !== "undefined"
          ? req.query.active === "true"
          : undefined,
      search: req.query.search,
    });
    res.json(users);
  }),
);

router.get(
  "/case-officers",
  requireRole("SUPERVISOR"),
  asyncHandler(async (req, res) => {
    const users = await userService.getCaseOfficers();
    res.json(users);
  }),
);

router.get(
  "/:id",
  requireRole("SUPERVISOR"),
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.json(user);
  }),
);

router.post(
  "/",
  requireRole("SUPERVISOR"),
  validateRequest({ body: createUserBodySchema }),
  asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  }),
);

router.patch(
  "/:id",
  requireRole("SUPERVISOR"),
  validateRequest({ params: idParamSchema, body: updateUserBodySchema }),
  asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body || {});
    res.json(user);
  }),
);

router.patch(
  "/:id/status",
  requireRole("SUPERVISOR"),
  validateRequest({
    params: idParamSchema,
    body: updateUserStatusBodySchema,
  }),
  asyncHandler(async (req, res) => {
    const user = await userService.updateUserStatus(
      req.params.id,
      req.body.isActive,
      req.user.id,
    );
    res.json(user);
  }),
);

module.exports = router;
