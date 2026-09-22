const pool = require("../config/database");

/**
 * Create a notification for a user.
 *
 * This service is used internally by the backend.
 *
 * It should NOT be called directly by the frontend.
 */
const createNotification = async ({
  recipientUserId,
  ticketId = null,
  relatedUserId = null,
  notificationType,
  title,
  body,
}) => {
  if (
    !recipientUserId ||
    !notificationType ||
    !title ||
    !body
  ) {
    throw new Error(
      "recipientUserId, notificationType, title and body are required"
    );
  }

  const result = await pool.query(
    `
    INSERT INTO notifications (
      recipient_user_id,
      ticket_id,
      related_user_id,
      notification_type,
      title,
      body
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      recipientUserId,
      ticketId,
      relatedUserId,
      notificationType,
      title,
      body,
    ]
  );

  return result.rows[0];
};

/**
 * Notify a user that a ticket has been assigned to them.
 */
const notifyTicketAssigned = async ({
  recipientUserId,
  ticketId,
  referenceNumber,
}) => {
  return createNotification({
    recipientUserId,
    ticketId,
    notificationType: "TICKET_ASSIGNED",
    title: "Ticket Assigned",
    body: `Ticket ${referenceNumber} has been assigned to you.`,
  });
};

/**
 * Notify the reporter that the ticket status changed.
 */
const notifyStatusChanged = async ({
  recipientUserId,
  ticketId,
  referenceNumber,
  oldStatus,
  newStatus,
}) => {
  return createNotification({
    recipientUserId,
    ticketId,
    notificationType: "STATUS_CHANGED",
    title: "Ticket Status Updated",
    body: `Ticket ${referenceNumber} status changed from ${oldStatus} to ${newStatus}.`,
  });
};

/**
 * Notify a user about an escalation.
 */
const notifyEscalation = async ({
  recipientUserId,
  ticketId,
  referenceNumber,
  severity,
}) => {
  return createNotification({
    recipientUserId,
    ticketId,
    notificationType: "TICKET_ESCALATED",
    title: "Ticket Escalated",
    body: `Ticket ${referenceNumber} has been escalated with ${severity} severity.`,
  });
};

module.exports = {
  createNotification,
  notifyTicketAssigned,
  notifyStatusChanged,
  notifyEscalation,
};