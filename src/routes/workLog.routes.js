const express = require("express");

const {
  getTicketWorkLogs,
  getWorkLogById,
  createWorkLog,
  updateWorkLog,
  deleteWorkLog,
} = require("../controllers/workLog.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

// Get all work logs for a ticket
router.get(
  "/ticket/:ticketId",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getTicketWorkLogs
);

// Get one work log
router.get(
  "/:id",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getWorkLogById
);

// Create work log
router.post(
  "/",
  authenticate,
  authorize("AGENT", "TECHNICIAN", "MANAGER"),
  createWorkLog
);

// Update work log
router.put(
  "/:id",
  authenticate,
  authorize("AGENT", "TECHNICIAN", "MANAGER"),
  updateWorkLog
);

// Delete work log
router.delete(
  "/:id",
  authenticate,
  authorize("AGENT", "TECHNICIAN", "MANAGER"),
  deleteWorkLog
);

module.exports = router;