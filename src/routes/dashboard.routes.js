const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getDashboard,
  getTeamDashboard,
} = require("../controllers/dashboard.controller");

const router = express.Router();

// Manager dashboard
router.get(
  "/",
  authenticate,
  authorize("MANAGER"),
  getDashboard
);

// Agent / Technician / Manager team dashboard
router.get(
  "/team",
  authenticate,
  authorize("AGENT", "TECHNICIAN", "MANAGER"),
  getTeamDashboard
);

module.exports = router;