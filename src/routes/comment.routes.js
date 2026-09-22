const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getTicketComments,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
} = require("../controllers/comment.controller");

const router = express.Router();

/**
 * Get all comments for a ticket
 */
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
  getTicketComments
);

/**
 * Get one comment
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
  getCommentById
);

/**
 * Create comment
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
  createComment
);

/**
 * Update comment
 */
router.put(
  "/:id",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  updateComment
);

/**
 * Delete comment
 */
router.delete(
  "/:id",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  deleteComment
);

module.exports = router;