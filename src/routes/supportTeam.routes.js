const express = require("express");

const {
  getSupportTeams,
  getSupportTeamById,
  createSupportTeam,
  updateSupportTeam,
} = require("../controllers/supportTeam.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @swagger
 * /api/support-teams:
 *   get:
 *     summary: Get all support teams
 *     tags:
 *       - Support Teams
 *     responses:
 *       200:
 *         description: Support teams retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/", getSupportTeams);

/**
 * @swagger
 * /api/support-teams/{id}:
 *   get:
 *     summary: Get support team by ID
 *     tags:
 *       - Support Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Support team retrieved successfully
 *       404:
 *         description: Support team not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getSupportTeamById);

/**
 * @swagger
 * /api/support-teams:
 *   post:
 *     summary: Create a support team
 *     tags:
 *       - Support Teams
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - team_name
 *             properties:
 *               team_name:
 *                 type: string
 *                 example: IT Support
 *               description:
 *                 type: string
 *                 example: Handles IT-related campus tickets
 *     responses:
 *       201:
 *         description: Support team created successfully
 *       400:
 *         description: Team name is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Support team already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticate,
  authorize("MANAGER"),
  createSupportTeam
);

/**
 * @swagger
 * /api/support-teams/{id}:
 *   put:
 *     summary: Update a support team
 *     tags:
 *       - Support Teams
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
 *               team_name:
 *                 type: string
 *                 example: Network Support
 *               description:
 *                 type: string
 *                 example: Handles network-related tickets
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Support team updated successfully
 *       400:
 *         description: Invalid team data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Support team not found
 *       409:
 *         description: Support team already exists
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticate,
  authorize("MANAGER"),
  updateSupportTeam
);

module.exports = router;