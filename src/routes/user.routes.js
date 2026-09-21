
const express = require("express");

const {
  getUsers,
  createUser,
} = require("../controllers/user.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users. Admin access required.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Authentication required or token is invalid
 *       403:
 *         description: User does not have admin permission
 *       500:
 *         description: Failed to retrieve users
 */
router.get(
  "/",
  authenticate,
  authorize("admin"),
  getUsers
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user. Admin access required.
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
 *               - role_id
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: new.user@bua.edu.eg
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Test123!
 *               full_name:
 *                 type: string
 *                 example: New User
 *               role_id:
 *                 type: integer
 *                 example: 4
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Required fields are missing
 *       401:
 *         description: Authentication required or token is invalid
 *       403:
 *         description: User does not have admin permission
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Failed to create user
 */
router.post(
  "/",
  authenticate,
  authorize("admin"),
  createUser
);

module.exports = router;

