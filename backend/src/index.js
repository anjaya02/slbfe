const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

const express = require("express");
const cors = require("cors");

const { testConnection, ensureRuntimeTables } = require("./config/db");
const AppError = require("./utils/app-error");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const complaintRoutes = require("./routes/complaint.routes");
const miscRoutes = require("./routes/misc.routes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:4200",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "slbfe-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api", miscRoutes);

app.use((req, res, next) => {
  next(new AppError(404, "Route not found"));
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message,
  });
});

async function startServer() {
  try {
    await testConnection();
    await ensureRuntimeTables();
    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
      console.log(`SLBFE backend listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
