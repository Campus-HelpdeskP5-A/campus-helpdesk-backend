const express = require("express");

const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  confirmResolution,
  reopenTicket,
} = require("../controllers/ticket.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Campus helpdesk ticket management
 */

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  "/",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getTickets
);

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Ticket retrieved successfully
 *       404:
 *         description: Ticket not found
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
  getTicketById
);

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - location_id
 *               - title
 *               - description
 *               - impact
 *               - urgency
 *             properties:
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               location_id:
 *                 type: string
 *                 format: uuid
 *               asset_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               impact:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               urgency:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  "/",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  createTicket
);

/**
 * @swagger
 * /api/tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [NEW, TRIAGED, ASSIGNED, IN_PROGRESS, WAITING, RESOLVED, REOPENED, CLOSED]
              reason:
                type: string
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
 *       404:
 *         description: Ticket not found
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  updateTicketStatus
);

router.post(
  "/:id/confirm-resolution",
  authenticate,
  authorize("REPORTER"),
  confirmResolution
);

router.post(
  "/:id/reopen",
  authenticate,
  authorize("REPORTER"),
  reopenTicket
);

module.exports = router;