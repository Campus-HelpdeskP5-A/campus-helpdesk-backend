const express = require("express");

const {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
} = require("../controllers/location.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get all locations
 *     tags:
 *       - Locations
 *     responses:
 *       200:
 *         description: Locations retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/", getLocations);

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     tags:
 *       - Locations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Location retrieved successfully
 *       404:
 *         description: Location not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getLocationById);

/**
 * @swagger
 * /api/locations:
 *   post:
 *     summary: Create a new location
 *     tags:
 *       - Locations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - building
 *               - room_code
 *             properties:
 *               building:
 *                 type: string
 *                 example: Building A
 *               floor:
 *                 type: string
 *                 example: 2nd Floor
 *               room_code:
 *                 type: string
 *                 example: A-201
 *               description:
 *                 type: string
 *                 example: Computer lab
 *     responses:
 *       201:
 *         description: Location created successfully
 *       400:
 *         description: Invalid location data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Location already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticate,
  authorize("MANAGER"),
  createLocation
);

/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     summary: Update location
 *     tags:
 *       - Locations
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
 *               building:
 *                 type: string
 *                 example: Building A
 *               floor:
 *                 type: string
 *                 example: 3rd Floor
 *               room_code:
 *                 type: string
 *                 example: A-301
 *               description:
 *                 type: string
 *                 example: Updated room description
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       400:
 *         description: Invalid location data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Location not found
 *       409:
 *         description: Location already exists
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticate,
  authorize("MANAGER"),
  updateLocation
);

module.exports = router;