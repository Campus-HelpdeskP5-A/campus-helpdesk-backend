
const express = require("express");
const pool = require("./config/database");

const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");

const categoryRoutes = require("./routes/category.routes");
const locationRoutes = require("./routes/location.routes");
const supportTeamRoutes = require("./routes/supportTeam.routes");

const ticketRoutes = require("./routes/ticket.routes");
const assignmentRoutes = require("./routes/assignment.routes");
const commentRoutes = require("./routes/comment.routes");
const attachmentRoutes = require("./routes/attachment.routes");
const ticketEventRoutes = require("./routes/ticketEvent.routes");
const statusHistoryRoutes = require("./routes/statusHistory.routes");
const escalationRoutes = require("./routes/escalation.routes");
const workLogRoutes = require("./routes/workLog.routes");

const slaRoutes = require("./routes/sla.routes");
const predictionRoutes = require("./routes/prediction.routes");
const notificationRoutes = require("./routes/notification.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const auditLogRoutes = require("./routes/auditLog.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const authenticate = require("./middlewares/auth.middleware");
const authorize = require("./middlewares/role.middleware");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

/**
 * CORS
 */
app.use((req, res, next) => {
  const defaultOrigins = [
    "http://localhost:5000",
    "http://localhost:5173",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5173",
    "https://campus-helpdesk-frontend-ewvvls3id-campus-helpdesk-p5-a.vercel.app",
  ];

  const configuredOrigins = String(
    process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || ""
  )
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const allowedOrigins = new Set([
    ...defaultOrigins,
    ...configuredOrigins,
  ]);

  const requestOrigin = req.headers.origin;

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
    res.header("Vary", "Origin");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/**
 * JSON body parser
 */
app.use(express.json());

/**
 * Swagger
 */
app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Campus Helpdesk API Documentation",
  })
);

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.json({
    message: "Campus Helpdesk API is running",
  });
});

/**
 * Database test
 */
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

/**
 * API Routes
 */

app.use("/api/categories", categoryRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/support-teams", supportTeamRoutes);

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/tickets", ticketRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/attachments", attachmentRoutes);

app.use("/api/ticket-events", ticketEventRoutes);
app.use("/api/status-history", statusHistoryRoutes);
app.use("/api/escalations", escalationRoutes);
app.use("/api/work-logs", workLogRoutes);

app.use("/api/sla", slaRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/dashboard", dashboardRoutes);

/**
 * Protected test route
 *
 * Manager only
 */
app.get(
  "/api/protected",
  authenticate,
  authorize("MANAGER"),
  (req, res) => {
    res.json({
      success: true,
      message: "You have access to this protected route",
      user: req.user,
    });
  }
);

module.exports = app;

