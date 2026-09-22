const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getTicketFeedback,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} = require("../controllers/feedback.controller");

const router = express.Router();

// Get feedback for a ticket
// Access is controlled inside the controller
// based on ticket ownership/team assignment/role.
router.get(
  "/ticket/:ticketId",
  authenticate,
  getTicketFeedback
);

// Get feedback by ID
// Access is controlled inside the controller.
router.get(
  "/:id",
  authenticate,
  getFeedbackById
);

// Create feedback
// Reporter only
router.post(
  "/",
  authenticate,
  authorize("REPORTER"),
  createFeedback
);

// Update feedback
// Reporter or Manager
router.put(
  "/:id",
  authenticate,
  authorize("REPORTER", "MANAGER"),
  updateFeedback
);

// Delete feedback
// Reporter or Manager
router.delete(
  "/:id",
  authenticate,
  authorize("REPORTER", "MANAGER"),
  deleteFeedback
);

module.exports = router;