const express = require("express");

const authService = require("../services/auth.service");
const { requireAuth } = require("../middleware/auth.middleware");
const validateRequest = require("../middleware/validate-request.middleware");
const asyncHandler = require("../utils/async-handler");
const {
  loginBodySchema,
  refreshTokenBodySchema,
  profileUpdateBodySchema,
  preferencesUpdateBodySchema,
  changePasswordBodySchema,
} = require("../validation/request-schemas");

const router = express.Router();

router.post(
  "/login",
  validateRequest({ body: loginBodySchema }),
  asyncHandler(async (req, res) => {
    const response = await authService.login(req.body);
    res.json(response);
  }),
);

router.post(
  "/refresh",
  validateRequest({ body: refreshTokenBodySchema }),
  asyncHandler(async (req, res) => {
    const response = await authService.refreshSession(req.body.refreshToken);
    res.json(response);
  }),
);

router.post(
  "/logout",
  validateRequest({ body: refreshTokenBodySchema }),
  asyncHandler(async (req, res) => {
    const response = await authService.logout(req.body.refreshToken);
    res.json(response);
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    res.json(user);
  }),
);

router.patch(
  "/me/profile",
  requireAuth,
  validateRequest({ body: profileUpdateBodySchema }),
  asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body || {});
    res.json(user);
  }),
);

router.patch(
  "/me/preferences",
  requireAuth,
  validateRequest({ body: preferencesUpdateBodySchema }),
  asyncHandler(async (req, res) => {
    const preferences = await authService.updatePreferences(
      req.user.id,
      req.body || {},
    );
    res.json(preferences);
  }),
);

router.patch(
  "/me/password",
  requireAuth,
  validateRequest({ body: changePasswordBodySchema }),
  asyncHandler(async (req, res) => {
    // Password changes are self-service, so use the authenticated user id.
    const response = await authService.updatePassword(req.user.id, req.body);
    res.json(response);
  }),
);

module.exports = router;
