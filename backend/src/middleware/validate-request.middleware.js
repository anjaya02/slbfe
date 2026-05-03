const { ZodError } = require("zod");

const AppError = require("../utils/app-error");

function formatValidationError(section, error) {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : section;
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  return `Invalid request ${section}: ${details}`;
}

function validateRequest(schemas = {}) {
  return function requestValidator(req, res, next) {
    try {
      for (const section of ["params", "query", "body"]) {
        const schema = schemas[section];

        if (!schema) {
          continue;
        }

        try {
          req[section] = schema.parse(req[section] ?? {});
        } catch (error) {
          if (error instanceof ZodError) {
            next(new AppError(400, formatValidationError(section, error)));
            return;
          }

          throw error;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = validateRequest;