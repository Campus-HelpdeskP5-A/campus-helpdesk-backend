
const express = require("express");

const authenticate = require("../middlewares/auth.middleware");

const authorize = require("../middlewares/role.middleware");

const {
  getDashboard,
  getTeamDashboard,
  getReporterDashboard,
  getAuditorDashboard,
  getAgentDashboard,
  getTechnicianDashboard,
} = require("../controllers/dashboard.controller");

const router = express.Router();

// Manager dashboard
router.get(
  "/",
  authenticate,
  authorize("MANAGER"),
  getDashboard
);

// Manager dashboard alias
router.get(
  "/manager",
  authenticate,
  authorize("MANAGER"),
  getDashboard
);

// Agent dashboard
router.get(
  "/agent",
  authenticate,
  authorize("AGENT"),
  getAgentDashboard
);

// Technician dashboard
router.get(
  "/technician",
  authenticate,
  authorize("TECHNICIAN"),
  getTechnicianDashboard
);

// Backward-compatible team dashboard for AGENT / TECHNICIAN
router.get(
  "/team",
  authenticate,
  authorize("MANAGER", "AGENT", "TECHNICIAN"),
  getTeamDashboard
);

// Reporter dashboard
router.get(
  "/reporter",
  authenticate,
  authorize("REPORTER"),
  getReporterDashboard
);

// Auditor dashboard
router.get(
  "/auditor",
  authenticate,
  authorize("AUDITOR"),
  getAuditorDashboard
);

module.exports = router;

