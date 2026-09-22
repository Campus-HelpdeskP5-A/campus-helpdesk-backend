const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getTicketAttachments,
  getAttachmentById,
  createAttachment,
  deleteAttachment,
} = require("../controllers/attachment.controller");

const router = express.Router();

/**
 * Get all attachments for a ticket
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
  getTicketAttachments
);

/**
 * Get one attachment
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
  getAttachmentById
);

/**
 * Create attachment metadata
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
  createAttachment
);

/**
 * Delete attachment
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
  deleteAttachment
);

module.exports = router;