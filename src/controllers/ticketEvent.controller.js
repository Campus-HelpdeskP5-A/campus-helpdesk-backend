const pool = require("../config/database");
const {
  canAccessTicket,
} = require("../utils/accessControl");

/**
 * GET /api/ticket-events/ticket/:ticketId
 *
 * Get all business events for a ticket.
 *
 * Access:
 * REPORTER
 * -> Own ticket only
 *
 * AGENT / TECHNICIAN
 * -> Directly assigned or team-assigned ticket
 *
 * MANAGER / AUDITOR
 * -> All tickets
 */
const getTicketEvents = async (
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

    const ticket =
      ticketResult.rows[0];

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
          "You do not have permission to access this ticket events",
      });
    }

    /**
     * Get events.
     */
    const result =
      await pool.query(
        `
        SELECT
          te.ticket_event_id,
          te.ticket_id,
          te.event_type,
          te.actor_user_id,
          u.full_name AS actor_name,
          u.role AS actor_role,
          te.event_data,
          te.created_at

        FROM ticket_events te

        LEFT JOIN users u
          ON u.user_id = te.actor_user_id

        WHERE te.ticket_id = $1

        ORDER BY te.created_at ASC
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
      "Get ticket events error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get ticket events",
    });
  }
};

/**
 * GET /api/ticket-events/:id
 *
 * Get one ticket event.
 */
const getTicketEventById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result =
      await pool.query(
        `
        SELECT
          te.ticket_event_id,
          te.ticket_id,
          te.event_type,
          te.actor_user_id,
          u.full_name AS actor_name,
          u.role AS actor_role,
          te.event_data,
          te.created_at,

          t.reporter_id

        FROM ticket_events te

        LEFT JOIN users u
          ON u.user_id = te.actor_user_id

        INNER JOIN tickets t
          ON t.ticket_id = te.ticket_id

        WHERE te.ticket_event_id = $1
        `,
        [id]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Ticket event not found",
      });
    }

    const event =
      result.rows[0];

    /**
     * Authorization.
     */
    const hasAccess =
      await canAccessTicket(
        req.user,
        event.ticket_id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this event",
      });
    }

    delete event.reporter_id;

    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error(
      "Get ticket event error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get ticket event",
    });
  }
};

/**
 * POST /api/ticket-events
 *
 * Manual event creation.
 *
 * This endpoint is mainly for controlled
 * backend/admin workflows.
 *
 * Normal business events should be created
 * automatically by their related controllers.
 */
const createTicketEvent = async (
  req,
  res
) => {
  try {
    const {
      ticket_id,
      event_type,
      event_data = null,
    } = req.body;

    /**
     * Basic validation.
     */
    if (!ticket_id || !event_type) {
      return res.status(400).json({
        success: false,
        message:
          "ticket_id and event_type are required",
      });
    }

    /**
     * Validate event type.
     */
    const normalizedEventType =
      String(event_type)
        .trim()
        .toUpperCase();

    if (!normalizedEventType) {
      return res.status(400).json({
        success: false,
        message:
          "event_type cannot be empty",
      });
    }

    /**
     * event_data must be
     * an object or null.
     */
    if (
      event_data !== null &&
      (
        typeof event_data !==
          "object" ||
        Array.isArray(event_data)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "event_data must be a JSON object or null",
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
          reporter_id
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

    /**
     * Reporter cannot manually
     * create business events.
     */
    if (
      req.user.role === "REPORTER"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Reporters cannot create ticket events",
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
          "Auditors cannot create ticket events",
      });
    }

    /**
     * Agent / Technician:
     * must have access to ticket.
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
            "You do not have permission to create an event for this ticket",
        });
      }
    }

    /**
     * Create event.
     */
    const result =
      await pool.query(
        `
        INSERT INTO ticket_events (
          ticket_id,
          event_type,
          actor_user_id,
          event_data
        )

        VALUES (
          $1,
          $2,
          $3,
          $4
        )

        RETURNING
          ticket_event_id,
          ticket_id,
          event_type,
          actor_user_id,
          event_data,
          created_at
        `,
        [
          ticket_id,
          normalizedEventType,
          req.user.user_id,
          event_data,
        ]
      );

    return res.status(201).json({
      success: true,
      message:
        "Ticket event created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Create ticket event error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create ticket event",
    });
  }
};

module.exports = {
  getTicketEvents,
  getTicketEventById,
  createTicketEvent,
};