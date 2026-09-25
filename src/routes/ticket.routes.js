
const express = require("express");

const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketTriage,
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
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
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
 *                 enum:
 *                   - LOW
 *                   - MEDIUM
 *                   - HIGH
 *               urgency:
 *                 type: string
 *                 enum:
 *                   - LOW
 *                   - MEDIUM
 *                   - HIGH
 *               attachments:
 *                 type: array
 *                 description: Initial attachment metadata. Actual file upload/storage is handled separately.
 *                 items:
 *                   type: object
 *                   required:
 *                     - file_uuid
 *                     - file_name
 *                     - file_size
 *                     - storage_path
 *                   properties:
 *                     file_uuid:
 *                       type: string
 *                       format: uuid
 *                       description: Unique UUID of the uploaded file.
 *                     file_name:
 *                       type: string
 *                       description: Original file name.
 *                     mime_type:
 *                       type: string
 *                       nullable: true
 *                       description: MIME type of the file.
 *                     file_size:
 *                       type: integer
 *                       minimum: 0
 *                       description: File size in bytes.
 *                     storage_path:
 *                       type: string
 *                       description: Path where the file is stored by the storage layer.
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only reporters can create tickets
 */
router.post(
  "/",
  authenticate,
  authorize("REPORTER"),
  createTicket
);

/**
 * @swagger
 * /api/tickets/{id}/triage:
 *   patch:
 *     summary: Update ticket category and priority
 *     description: Allows an agent to update the category and/or priority of an existing ticket during triage.
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
 *             properties:
 *               category_id:
 *                 type: string
 *                 format: uuid
 *                 description: Active category ID.
 *               priority:
 *                 type: string
 *                 enum:
 *                   - LOW
 *                   - MEDIUM
 *                   - HIGH
 *                   - CRITICAL
 *                 description: Ticket priority.
 *             example:
 *               category_id: "20000000-0000-0000-0000-000000000001"
 *               priority: "HIGH"
 *     responses:
 *       200:
 *         description: Ticket triage updated successfully
 *       400:
 *         description: Invalid category or priority
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only agents can update ticket category or priority
 *       404:
 *         description: Ticket or category not found
 *       500:
 *         description: Failed to update ticket triage
 */
router.patch(
  "/:id/triage",
  authenticate,
  authorize("AGENT"),
  updateTicketTriage
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
 *                 enum:
 *                   - NEW
 *                   - TRIAGED
 *                   - ASSIGNED
 *                   - IN_PROGRESS
 *                   - WAITING
 *                   - RESOLVED
 *                   - REOPENED
 *                   - CLOSED
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to update ticket status
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

/**
 * @swagger
 * /api/tickets/{id}/confirm-resolution:
 *   post:
 *     summary: Confirm ticket resolution
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
 *         description: Resolution confirmed successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only the reporter can confirm resolution
 *       404:
 *         description: Ticket not found
 */
router.post(
  "/:id/confirm-resolution",
  authenticate,
  authorize("REPORTER"),
  confirmResolution
);

/**
 * @swagger
 * /api/tickets/{id}/reopen:
 *   post:
 *     summary: Reopen a resolved or closed ticket
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
 *         description: Ticket reopened successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only the reporter can reopen a ticket
 *       404:
 *         description: Ticket not found
 */
router.post(
  "/:id/reopen",
  authenticate,
  authorize("REPORTER"),
  reopenTicket
);

module.exports = router;
