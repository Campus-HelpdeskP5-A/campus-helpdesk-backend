const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getTicketEvents,
  getTicketEventById,
  createTicketEvent,
} = require("../controllers/ticketEvent.controller");

const router = express.Router();

/**
 * Get all events for a ticket
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
  getTicketEvents
);

/**
 * Get one event
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
  getTicketEventById
);

/**
 * Create event
 */
router.post(
  "/",
  authenticate,
  authorize(
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  createTicketEvent
);

module.exports = router;