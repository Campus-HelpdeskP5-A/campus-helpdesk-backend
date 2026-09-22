const pool = require("../config/database");
const {
  canAccessTicket,
} = require("../utils/accessControl");

/**
 * Allowed ticket statuses.
 *
 * Keep these values aligned with the
 * tickets.status CHECK constraint.
 */
const VALID_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING",
  "RESOLVED",
  "CLOSED",
];

/**
 * GET /api/status-history/ticket/:ticketId
 *
 * Get all status changes for a ticket.
 *
 * Access:
 *
 * REPORTER
 * -> Own ticket only
 *
 * AGENT / TECHNICIAN
 * -> Directly assigned or team-assigned ticket
 *
 * MANAGER / AUDITOR
 * -> All tickets
 */
const getTicketStatusHistory = async (
  req,
  res
) => {
  try {
    const { ticketId } = req.params;

    /**
     * Check ticket exists.
     */
    const ticketResult =
      await pool.query(
        `
        SELECT
          ticket_id,
          reporter_id
        FROM tickets
        WHERE ticket_id = $1
        `,
        [ticketId]
      );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    /**
     * Authorization.
     */
    const hasAccess =
      await canAccessTicket(
        req.user,
        ticketId
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this ticket status history",
      });
    }

    /**
     * Get history.
     */
    const result =
      await pool.query(
        `
        SELECT
          sh.status_history_id,
          sh.ticket_id,
          sh.old_status,
          sh.new_status,
          sh.changed_at,
          sh.changed_by,
          u.full_name AS changed_by_name,
          u.role AS changed_by_role,
          sh.reason

        FROM status_histories sh

        INNER JOIN users u
          ON u.user_id = sh.changed_by

        WHERE sh.ticket_id = $1

        ORDER BY sh.changed_at ASC
        `,
        [ticketId]
      );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Get status history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get status history",
    });
  }
};

/**
 * GET /api/status-history/:id
 *
 * Get one status history record.
 */
const getStatusHistoryById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result =
      await pool.query(
        `
        SELECT
          sh.status_history_id,
          sh.ticket_id,
          sh.old_status,
          sh.new_status,
          sh.changed_at,
          sh.changed_by,
          u.full_name AS changed_by_name,
          u.role AS changed_by_role,
          sh.reason,

          t.reporter_id

        FROM status_histories sh

        INNER JOIN users u
          ON u.user_id = sh.changed_by

        INNER JOIN tickets t
          ON t.ticket_id = sh.ticket_id

        WHERE sh.status_history_id = $1
        `,
        [id]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Status history record not found",
      });
    }

    const history =
      result.rows[0];

    /**
     * Authorization.
     */
    const hasAccess =
      await canAccessTicket(
        req.user,
        history.ticket_id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this record",
      });
    }

    delete history.reporter_id;

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error(
      "Get status history record error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get status history record",
    });
  }
};

/**
 * POST /api/status-history
 *
 * Manually create a status history record.
 *
 * IMPORTANT:
 * Normal status changes should NOT depend
 * on this endpoint.
 *
 * Ticket workflows create history automatically
 * inside their transactions.
 */
const createStatusHistory = async (
  req,
  res
) => {
  try {
    const {
      ticket_id,
      old_status = null,
      new_status,
      reason = null,
    } = req.body;

    /**
     * Basic validation.
     */
    if (!ticket_id || !new_status) {
      return res.status(400).json({
        success: false,
        message:
          "ticket_id and new_status are required",
      });
    }

    /**
     * Normalize statuses.
     */
    const normalizedNewStatus =
      String(new_status)
        .trim()
        .toUpperCase();

    const normalizedOldStatus =
      old_status === null ||
      old_status === undefined ||
      old_status === ""
        ? null
        : String(old_status)
            .trim()
            .toUpperCase();

    /**
     * Validate new status.
     */
    if (
      !VALID_STATUSES.includes(
        normalizedNewStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid new_status",
      });
    }

    /**
     * Validate old status.
     */
    if (
      normalizedOldStatus !== null &&
      !VALID_STATUSES.includes(
        normalizedOldStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid old_status",
      });
    }

    /**
     * Status must actually change.
     */
    if (
      normalizedOldStatus !== null &&
      normalizedOldStatus ===
        normalizedNewStatus
    ) {
      return res.status(400).json({
        success: false,
        message:
          "old_status and new_status must be different",
      });
    }

    /**
     * Check ticket.
     */
    const ticketResult =
      await pool.query(
        `
        SELECT
          ticket_id,
          reporter_id,
          status
        FROM tickets
        WHERE ticket_id = $1
        `,
        [ticket_id]
      );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const ticket =
      ticketResult.rows[0];

    /**
     * Reporter cannot create history.
     */
    if (
      req.user.role === "REPORTER"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Reporters cannot create status history records",
      });
    }

    /**
     * Auditor is read-only.
     */
    if (
      req.user.role === "AUDITOR"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Auditors cannot create status history records",
      });
    }

    /**
     * Agent / Technician must have
     * access to the ticket.
     */
    if (
      req.user.role === "AGENT" ||
      req.user.role === "TECHNICIAN"
    ) {
      const hasAccess =
        await canAccessTicket(
          req.user,
          ticket_id
        );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to create status history for this ticket",
        });
      }
    }

    /**
     * If old_status was provided,
     * make sure it matches the actual
     * current ticket status.
     *
     * This prevents fake transitions.
     */
    if (
      normalizedOldStatus !== null &&
      ticket.status !==
        normalizedOldStatus
    ) {
      return res.status(409).json({
        success: false,
        message:
          `Current ticket status is ${ticket.status}, not ${normalizedOldStatus}`,
      });
    }

    /**
     * The new status should match
     * the ticket's actual current status
     * when this endpoint is used manually.
     *
     * This keeps status_history consistent
     * with tickets.
     */
    if (
      ticket.status !==
      normalizedNewStatus
    ) {
      return res.status(409).json({
        success: false,
        message:
          `Ticket current status is ${ticket.status}. Update the ticket status first.`,
      });
    }

    /**
     * Create history record.
     */
    const result =
      await pool.query(
        `
        INSERT INTO status_histories (
          ticket_id,
          old_status,
          new_status,
          changed_by,
          reason
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )

        RETURNING
          status_history_id,
          ticket_id,
          old_status,
          new_status,
          changed_at,
          changed_by,
          reason
        `,
        [
          ticket_id,
          normalizedOldStatus,
          normalizedNewStatus,
          req.user.user_id,
          reason
            ? String(reason).trim()
            : null,
        ]
      );

    return res.status(201).json({
      success: true,
      message:
        "Status history created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Create status history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create status history",
    });
  }
};

module.exports = {
  getTicketStatusHistory,
  getStatusHistoryById,
  createStatusHistory,
};