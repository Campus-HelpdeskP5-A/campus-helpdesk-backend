const express = require("express");

const {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  removeAssignment,
} = require("../controllers/assignment.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Ticket assignment management
 */

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: Get assignments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
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
  getAssignments
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get assignment by ID
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
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
  getAssignmentById
);

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Assign a ticket
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticket_id
 *             properties:
 *               ticket_id:
 *                 type: string
 *                 format: uuid
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               assigned_team_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               reason:
 *                 type: string
 */
router.post(
  "/",
  authenticate,
  authorize("AGENT", "MANAGER"),
  createAssignment
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   patch:
 *     summary: Reassign a ticket
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:id",
  authenticate,
  authorize("AGENT", "MANAGER"),
  updateAssignment
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   delete:
 *     summary: Remove current assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  authenticate,
  authorize("AGENT", "MANAGER"),
  removeAssignment
);

module.exports = router;