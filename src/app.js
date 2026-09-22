const express = require("express");
const pool = require("./config/database");
const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");
const authenticate = require("./middlewares/auth.middleware");
const authorize = require("./middlewares/role.middleware");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
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
const slaRoutes = require("./routes/sla.routes");
const predictionRoutes = require("./routes/prediction.routes");
const notificationRoutes = require("./routes/notification.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const auditLogRoutes = require("./routes/auditLog.routes");
const dashboardRoutes = require("./routes/dashboard.routes");



const app = express();

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/", (req, res) => {
  res.json({
    message: "Campus Helpdesk API is running",
  });
});

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

app.use("/api/categories", categoryRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/support-teams", supportTeamRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/ticket-events", ticketEventRoutes);
app.use("/api/status-history", statusHistoryRoutes);
app.use("/api/work-logs", workLogRoutes);
app.use("/api/sla", slaRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/dashboard", dashboardRoutes);

/**
 * @swagger
 * /api/protected:
 *   get:
 *     summary: Access protected admin route
 *     description: Test endpoint protected by JWT authentication and admin role authorization.
 *     tags:
 *       - Authorization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access granted
 *       401:
 *         description: Authentication required or token is invalid
 *       403:
 *         description: User does not have admin permission
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