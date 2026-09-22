const express = require("express");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const {
  getNotifications,
  getNotificationById,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notification.controller");

const router = express.Router();

// Get current user's notifications
router.get(
  "/",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getNotifications
);

// Mark all notifications as read
router.patch(
  "/read-all",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  markAllNotificationsAsRead
);

// Get notification by ID
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
  getNotificationById
);

// Create notification
router.post(
  "/",
  authenticate,
  authorize(
    "AGENT",
    "TECHNICIAN",
    "MANAGER"
  ),
  createNotification
);

// Mark notification as read
router.patch(
  "/:id/read",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  markNotificationAsRead
);

module.exports = router;