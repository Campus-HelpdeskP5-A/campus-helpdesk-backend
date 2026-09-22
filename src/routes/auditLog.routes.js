const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getAuditLogs,
  getAuditLogById,
  createAuditLog,
} = require("../controllers/auditLog.controller");

const router = express.Router();

// Get audit logs
// Manager + Auditor
router.get(
  "/",
  authenticate,
  authorize("MANAGER", "AUDITOR"),
  getAuditLogs
);

// Get audit log by ID
// Manager + Auditor
router.get(
  "/:id",
  authenticate,
  authorize("MANAGER", "AUDITOR"),
  getAuditLogById
);

// Manual audit log creation
// Manager only
router.post(
  "/",
  authenticate,
  authorize("MANAGER"),
  createAuditLog
);

module.exports = router;