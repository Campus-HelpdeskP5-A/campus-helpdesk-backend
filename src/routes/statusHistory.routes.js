const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getTicketStatusHistory,
  getStatusHistoryById,
  createStatusHistory,
} = require("../controllers/statusHistory.controller");

const router = express.Router();

/**
 * Get status history for a ticket
 */
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
  getTicketStatusHistory
);

/**
 * Get one status history record
 */
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
  getStatusHistoryById
);

/**
 * Create status history
 */
router.post(
  "/",
  authenticate,
  authorize(
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  createStatusHistory
);

module.exports = router;