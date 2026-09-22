const express = require("express");

const {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
} = require("../controllers/category.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/", getCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category UUID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getCategoryById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_name
 *           properties:
 *             category_name:
 *               type: string
 *               example: IT Support
 *             description:
 *               type: string
 *               example: Technical issues related to IT services
 *             default_team_id:
 *               type: string
 *               format: uuid
 *               nullable: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Category name is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Category already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticate,
  authorize("MANAGER"),
  createCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *           properties:
 *             category_name:
 *               type: string
 *               example: Technical Support
 *             description:
 *               type: string
 *               example: Updated category description
 *             default_team_id:
 *               type: string
 *               format: uuid
 *               nullable: true
 *             is_active:
 *               type: boolean
 *               example: true
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid category data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category already exists
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticate,
  authorize("MANAGER"),
  updateCategory
);

module.exports = router;