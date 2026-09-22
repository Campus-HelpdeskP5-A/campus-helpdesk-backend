const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getTicketPredictions,
  getPredictionById,
  createPrediction,
  reviewPrediction,
} = require("../controllers/prediction.controller");

const router = express.Router();

// Get all predictions for a ticket
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
  getTicketPredictions
);

// Get prediction by ID
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
  getPredictionById
);

// Create AI prediction
router.post(
  "/",
  authenticate,
  authorize(
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  createPrediction
);

// Human review / override
router.patch(
  "/:id/review",
  authenticate,
  authorize(
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  reviewPrediction
);

module.exports = router;