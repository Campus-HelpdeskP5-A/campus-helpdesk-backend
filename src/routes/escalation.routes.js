const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getTicketEscalations,
  getEscalationById,
  createEscalation,
  resolveEscalation,
} = require("../controllers/escalation.controller");

const router = express.Router();

/**
 * Get all escalations for a ticket
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
  getTicketEscalations
);

/**
 * Get one escalation
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
  getEscalationById
);

/**
 * Create escalation
 */
router.post(
  "/",
  authenticate,
  authorize(
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  createEscalation
);

/**
 * Resolve escalation
 */
router.patch(
  "/:id/resolve",
  authenticate,
  authorize(
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  resolveEscalation
);

module.exports = router;