const express = require("express");
const pool = require("./config/database");
const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");
const authenticate = require("./middlewares/auth.middleware");
const authorize = require("./middlewares/role.middleware");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const categoryRoutes = require("./routes/category.routes");

const app = express();

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://campus-helpdesk-frontend.vercel.app"
  );

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

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/categories", categoryRoutes);

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

app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);

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