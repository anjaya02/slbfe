const { z } = require("zod");

const { STATUS_VALUES } = require("../repositories/complaint.repository");

const USER_ROLES = ["SUPERVISOR", "CASE_OFFICER"];
const REPORT_TYPES = ["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"];

function withAtLeastOneField(schema, message) {
  return schema.refine((value) => Object.keys(value).length > 0, {
    message,
  });
}

const nonEmptyString = (fieldName, maxLength = 255) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`);

const optionalString = (fieldName, maxLength = 255) =>
  z
    .string()
    .trim()
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`)
    .optional();

const idParamSchema = z
  .object({
    id: nonEmptyString("id", 100),
  })
  .strict();

const emptyBodySchema = z.object({}).strict();

const loginBodySchema = z
  .object({
    email: z.string().trim().email("email must be a valid email address"),
    password: z
      .string()
      .min(8, "password must be at least 8 characters long")
      .max(255, "password must be at most 255 characters long"),
  })
  .strict();

const refreshTokenBodySchema = z
  .object({
    refreshToken: nonEmptyString("refreshToken", 500),
  })
  .strict();

const profileUpdateBodySchema = withAtLeastOneField(
  z
    .object({
      name: nonEmptyString("name", 120).optional(),
      phone: optionalString("phone", 50),
      location: optionalString("location", 120),
      workCountry: optionalString("workCountry", 100),
      avatar: optionalString("avatar", 500),
    })
    .strict(),
  "At least one profile field is required",
);

const preferencesUpdateBodySchema = withAtLeastOneField(
  z
    .object({
      notificationsEnabled: z.boolean().optional(),
      dateFormat: nonEmptyString("dateFormat", 50).optional(),
    })
    .strict(),
  "At least one preference field is required",
);

const createUserBodySchema = z
  .object({
    name: nonEmptyString("name", 120),
    email: z.string().trim().email("email must be a valid email address"),
    role: z.enum(USER_ROLES),
    password: z
      .string()
      .min(8, "password must be at least 8 characters long")
      .max(255, "password must be at most 255 characters long"),
    phone: optionalString("phone", 50),
    location: optionalString("location", 120),
    workCountry: optionalString("workCountry", 100),
    avatar: optionalString("avatar", 500),
    dateFormat: nonEmptyString("dateFormat", 50).optional(),
  })
  .strict();

const updateUserBodySchema = withAtLeastOneField(
  z
    .object({
      name: nonEmptyString("name", 120).optional(),
      email: z
        .string()
        .trim()
        .email("email must be a valid email address")
        .optional(),
      role: z.enum(USER_ROLES).optional(),
      phone: optionalString("phone", 50),
      location: optionalString("location", 120),
      workCountry: optionalString("workCountry", 100),
      avatar: optionalString("avatar", 500),
    })
    .strict(),
  "At least one user field is required",
);

const updateUserStatusBodySchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

const complaintStatusBodySchema = z
  .object({
    newStatus: z.enum(STATUS_VALUES),
    note: optionalString("note", 2000),
  })
  .strict();

const complaintAssignmentBodySchema = z
  .object({
    officerId: nonEmptyString("officerId", 100),
    note: optionalString("note", 2000),
  })
  .strict();

const complaintNoteBodySchema = z
  .object({
    content: nonEmptyString("content", 2000),
    isInternal: z.boolean().optional(),
  })
  .strict();

const reportGenerateBodySchema = z
  .object({
    reportType: z.enum(REPORT_TYPES),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    statuses: z.array(z.enum(STATUS_VALUES)).optional(),
    types: z.array(nonEmptyString("types", 100)).optional(),
    branch: optionalString("branch", 120),
    officerId: optionalString("officerId", 100),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.reportType === "CUSTOM") {
      if (!value.dateFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateFrom"],
          message: "dateFrom is required for CUSTOM reports",
        });
      }

      if (!value.dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateTo"],
          message: "dateTo is required for CUSTOM reports",
        });
      }
    }

    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "dateTo must be on or after dateFrom",
      });
    }
  });

module.exports = {
  idParamSchema,
  emptyBodySchema,
  loginBodySchema,
  refreshTokenBodySchema,
  profileUpdateBodySchema,
  preferencesUpdateBodySchema,
  createUserBodySchema,
  updateUserBodySchema,
  updateUserStatusBodySchema,
  complaintStatusBodySchema,
  complaintAssignmentBodySchema,
  complaintNoteBodySchema,
  reportGenerateBodySchema,
};
