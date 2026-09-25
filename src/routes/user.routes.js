
const express = require("express");

const {
  getUsers,
  getPendingUsers,
  getTechnicians,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  approveUser,
} = require("../controllers/user.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  authenticate,
  authorize("MANAGER", "AUDITOR"),
  getUsers
);

/**
 * @swagger
 * /api/users/pending:
 *   get:
 *     summary: Get pending user approvals
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending users retrieved successfully
 */
router.get(
  "/pending",
  authenticate,
  authorize("MANAGER"),
  getPendingUsers
);

/**
 * @swagger
 * /api/users/technicians:
 *   get:
 *     summary: Get active technicians with workload
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Technicians retrieved successfully
 */
router.get(
  "/technicians",
  authenticate,
  authorize("REPORTER", "AGENT", "TECHNICIAN", "MANAGER", "AUDITOR"),
  getTechnicians
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags:
 *       - Users
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
 *         description: User retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  authenticate,
  authorize("MANAGER", "AUDITOR"),
  getUserById
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - full_name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@bua.edu.eg
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Dev12345!
 *               full_name:
 *                 type: string
 *                 example: New User
 *               role:
 *                 type: string
 *                 enum:
 *                   - REPORTER
 *                   - AGENT
 *                   - TECHNICIAN
 *                   - MANAGER
 *                   - AUDITOR
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid user data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: User already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticate,
  authorize("MANAGER"),
  createUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags:
 *       - Users
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
 *               email:
 *                 type: string
 *                 format: email
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum:
 *                   - REPORTER
 *                   - AGENT
 *                   - TECHNICIAN
 *                   - MANAGER
 *                   - AUDITOR
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid user data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticate,
  authorize("MANAGER"),
  updateUser
);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a user
 *     tags:
 *       - Users
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
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: is_active must be a boolean
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("MANAGER"),
  updateUserStatus
);

/**
 * @swagger
 * /api/users/{id}/approve:
 *   patch:
 *     summary: Approve a pending Technician or Manager account
 *     tags:
 *       - Users
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
 *         description: User approved successfully
 *       400:
 *         description: User cannot be approved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only Managers can approve users
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id/approve",
  authenticate,
  authorize("MANAGER"),
  approveUser
);

module.exports = router;

