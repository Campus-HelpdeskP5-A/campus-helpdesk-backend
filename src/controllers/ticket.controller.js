const pool = require("../config/database");

const {
  canAccessTicket,
  getTicketAccessFilter,
} = require("../utils/accessControl");

const VALID_IMPACTS = ["LOW", "MEDIUM", "HIGH"];
const VALID_URGENCIES = ["LOW", "MEDIUM", "HIGH"];

const VALID_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING",
  "RESOLVED",
  "CLOSED",
];

/**
 * GET /api/tickets
 *
 * Access:
 * - REPORTER: own tickets only
 * - AGENT: tickets assigned to them or their active teams
 * - TECHNICIAN: tickets assigned to them or their active teams
 * - MANAGER: all tickets
 * - AUDITOR: all tickets (read-only)
 */
const getTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      category_id,
      limit = 100,
      offset = 0,
    } = req.query;

    const parsedLimit = Math.min(
      Math.max(Number(limit) || 100, 1),
      500
    );

    const parsedOffset = Math.max(
      Number(offset) || 0,
      0
    );

    const accessFilter = await getTicketAccessFilter(req.user);

    const conditions = [accessFilter.clause];
    const values = [...accessFilter.values];

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
          allowed_values: VALID_STATUSES,
        });
      }

      values.push(status);
      conditions.push(`t.status = $${values.length}`);
    }

    if (priority) {
      values.push(priority);
      conditions.push(`t.priority = $${values.length}`);
    }

    if (category_id) {
      values.push(category_id);
      conditions.push(`t.category_id = $${values.length}`);
    }

    values.push(parsedLimit);
    const limitPlaceholder = `$${values.length}`;

    values.push(parsedOffset);
    const offsetPlaceholder = `$${values.length}`;

    const result = await pool.query(
      `
      SELECT
        t.ticket_id,
        t.reference_number,

        t.reporter_id,
        reporter.full_name AS reporter_name,
        reporter.email AS reporter_email,

        t.category_id,
        c.category_name,

        t.location_id,
        l.building,
        l.floor,
        l.room_code,

        t.asset_id,
        t.sla_profile_id,

        t.title,
        t.description,
        t.impact,
        t.urgency,
        t.priority,
        t.status,

        t.response_due_at,
        t.resolution_due_at,
        t.first_response_at,
        t.resolved_at,
        t.closed_at,

        t.created_at,
        t.updated_at

      FROM tickets t

      JOIN users reporter
        ON reporter.user_id = t.reporter_id

      JOIN categories c
        ON c.category_id = t.category_id

      JOIN locations l
        ON l.location_id = t.location_id

      WHERE ${conditions.join(" AND ")}

      ORDER BY t.created_at DESC

      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
      `,
      values
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        count: result.rows.length,
      },
    });
  } catch (error) {
    console.error("Get tickets error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve tickets",
    });
  }
};

/**
 * GET /api/tickets/:id
 *
 * Access:
 * - REPORTER: own ticket
 * - AGENT: assigned to them or their active team
 * - TECHNICIAN: assigned to them or their active team
 * - MANAGER: all
 * - AUDITOR: all
 */
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const access = await canAccessTicket(
      req.user,
      id
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this ticket",
      });
    }

    const result = await pool.query(
      `
      SELECT
        t.ticket_id,
        t.reference_number,

        t.reporter_id,
        reporter.full_name AS reporter_name,
        reporter.email AS reporter_email,

        t.category_id,
        c.category_name,

        t.location_id,
        l.building,
        l.floor,
        l.room_code,

        t.asset_id,
        t.sla_profile_id,

        t.title,
        t.description,
        t.impact,
        t.urgency,
        t.priority,
        t.status,

        t.response_due_at,
        t.resolution_due_at,
        t.first_response_at,
        t.resolved_at,
        t.closed_at,

        t.created_at,
        t.updated_at

      FROM tickets t

      JOIN users reporter
        ON reporter.user_id = t.reporter_id

      JOIN categories c
        ON c.category_id = t.category_id

      JOIN locations l
        ON l.location_id = t.location_id

      WHERE t.ticket_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get ticket error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ticket",
    });
  }
};

/**
 * POST /api/tickets
 */
const createTicket = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      category_id,
      location_id,
      asset_id,
      title,
      description,
      impact,
      urgency,
    } = req.body;

    if (
      !category_id ||
      !location_id ||
      !title ||
      !description ||
      !impact ||
      !urgency
    ) {
      return res.status(400).json({
        success: false,
        message:
          "category_id, location_id, title, description, impact and urgency are required",
      });
    }

    if (!VALID_IMPACTS.includes(impact)) {
      return res.status(400).json({
        success: false,
        message: "Invalid impact value",
        allowed_values: VALID_IMPACTS,
      });
    }

    if (!VALID_URGENCIES.includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid urgency value",
        allowed_values: VALID_URGENCIES,
      });
    }

    /**
     * The authenticated user becomes the reporter.
     */
    const reporterId = req.user.user_id;

    await client.query("BEGIN");

    /**
     * 1. Validate category
     */
    const categoryResult = await client.query(
      `
      SELECT
        category_id,
        category_name,
        is_active
      FROM categories
      WHERE category_id = $1
      `,
      [category_id]
    );

    if (categoryResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (!categoryResult.rows[0].is_active) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Category is inactive",
      });
    }

    /**
     * 2. Validate location
     */
    const locationResult = await client.query(
      `
      SELECT
        location_id,
        building,
        room_code
      FROM locations
      WHERE location_id = $1
      `,
      [location_id]
    );

    if (locationResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    /**
     * 3. Calculate priority + SLA
     */
    const matrixResult = await client.query(
      `
      SELECT
        pm.priority,
        pm.sla_profile_id,
        sp.name AS sla_profile_name,
        sp.response_target_minutes,
        sp.resolution_target_minutes

      FROM priority_matrices pm

      INNER JOIN sla_profiles sp
        ON sp.sla_profile_id = pm.sla_profile_id

      WHERE pm.impact = $1
        AND pm.urgency = $2
        AND pm.is_active = true
        AND sp.is_active = true

      LIMIT 1
      `,
      [impact, urgency]
    );

    if (matrixResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "No active priority matrix exists for the selected impact and urgency",
      });
    }

    const matrix = matrixResult.rows[0];

    /**
     * 4. Calculate SLA deadlines
     *
     * Current implementation:
     * direct elapsed minutes.
     *
     * Business-hours-aware calculation
     * will be handled in the SLA integration phase.
     */
    const now = new Date();

    const responseDueAt = new Date(
      now.getTime() +
        matrix.response_target_minutes * 60 * 1000
    );

    const resolutionDueAt = new Date(
      now.getTime() +
        matrix.resolution_target_minutes * 60 * 1000
    );

    /**
     * 5. Generate reference number
     *
     * Example:
     * HLP-000001
     */
    const referenceResult = await client.query(`
      SELECT
        COALESCE(
          MAX(
            CAST(
              SUBSTRING(
                reference_number
                FROM 'HLP-([0-9]+)'
              ) AS INTEGER
            )
          ),
          0
        ) + 1 AS next_number
      FROM tickets
      WHERE reference_number LIKE 'HLP-%'
    `);

    const nextNumber =
      referenceResult.rows[0].next_number;

    const referenceNumber =
      `HLP-${String(nextNumber).padStart(6, "0")}`;

    /**
     * 6. Insert ticket
     */
    const ticketResult = await client.query(
      `
      INSERT INTO tickets (
        reference_number,
        reporter_id,
        category_id,
        location_id,
        asset_id,
        sla_profile_id,
        title,
        description,
        impact,
        urgency,
        priority,
        status,
        response_due_at,
        resolution_due_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14
      )
      RETURNING *
      `,
      [
        referenceNumber,
        reporterId,
        category_id,
        location_id,
        asset_id || null,
        matrix.sla_profile_id,
        title,
        description,
        impact,
        urgency,
        matrix.priority,
        "OPEN",
        responseDueAt,
        resolutionDueAt,
      ]
    );

    const ticket = ticketResult.rows[0];

    /**
     * 7. Create business event
     */
    await client.query(
      `
      INSERT INTO ticket_events (
        ticket_id,
        event_type,
        actor_user_id,
        event_data
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        ticket.ticket_id,
        "TICKET_CREATED",
        req.user.user_id,
        JSON.stringify({
          reference_number:
            ticket.reference_number,
          title: ticket.title,
          priority: ticket.priority,
          status: ticket.status,
        }),
      ]
    );

    /**
     * 8. Create initial status history
     */
    await client.query(
      `
      INSERT INTO status_histories (
        ticket_id,
        old_status,
        new_status,
        changed_by,
        reason
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        ticket.ticket_id,
        null,
        "OPEN",
        req.user.user_id,
        "Ticket created",
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: {
        ticket,
        priority: matrix.priority,
        sla: {
          sla_profile_id:
            matrix.sla_profile_id,

          name: matrix.sla_profile_name,

          response_target_minutes:
            matrix.response_target_minutes,

          resolution_target_minutes:
            matrix.resolution_target_minutes,

          response_due_at:
            responseDueAt,

          resolution_due_at:
            resolutionDueAt,
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create ticket error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "Ticket reference number already exists",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message:
          "One of the referenced resources does not exist",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create ticket",
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/tickets/:id/status
 */
const updateTicketStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { status } = req.body;

    /**
     * 1. Validate status
     */
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
        allowed_values: VALID_STATUSES,
      });
    }

    /**
     * 2. Check ticket access
     */
    const access = await canAccessTicket(
      req.user,
      id
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this ticket",
      });
    }

    /**
     * 3. Get ticket
     */
    const ticketResult = await client.query(
      `
      SELECT *
      FROM tickets
      WHERE ticket_id = $1
      `,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const ticket = ticketResult.rows[0];

    /**
     * 4. Reporters cannot change status
     */
    if (req.user.role === "REPORTER") {
      return res.status(403).json({
        success: false,
        message:
          "Reporters cannot change ticket status",
      });
    }

    /**
     * 5. Prevent duplicate status transition
     */
    if (ticket.status === status) {
      return res.status(400).json({
        success: false,
        message:
          `Ticket is already in ${status} status`,
      });
    }

    await client.query("BEGIN");

    const now = new Date();

    let firstResponseAt =
      ticket.first_response_at;

    let resolvedAt =
      ticket.resolved_at;

    let closedAt =
      ticket.closed_at;

    /**
     * First response
     */
    if (
      !firstResponseAt &&
      [
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
      ].includes(status)
    ) {
      firstResponseAt = now;
    }

    /**
     * Resolution
     */
    if (
      status === "RESOLVED" &&
      !resolvedAt
    ) {
      resolvedAt = now;
    }

    /**
     * Closure
     */
    if (
      status === "CLOSED" &&
      !closedAt
    ) {
      closedAt = now;
    }

    /**
     * 6. Update ticket
     */
    const result = await client.query(
      `
      UPDATE tickets
      SET
        status = $1,
        first_response_at = $2,
        resolved_at = $3,
        closed_at = $4,
        updated_at = NOW()
      WHERE ticket_id = $5
      RETURNING *
      `,
      [
        status,
        firstResponseAt,
        resolvedAt,
        closedAt,
        id,
      ]
    );

    /**
     * 7. Status history
     */
    await client.query(
      `
      INSERT INTO status_histories (
        ticket_id,
        old_status,
        new_status,
        changed_by,
        reason
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        id,
        ticket.status,
        status,
        req.user.user_id,
        "Ticket status updated",
      ]
    );

    /**
     * 8. Business event
     */
    await client.query(
      `
      INSERT INTO ticket_events (
        ticket_id,
        event_type,
        actor_user_id,
        event_data
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        id,
        "STATUS_CHANGED",
        req.user.user_id,
        JSON.stringify({
          old_status: ticket.status,
          new_status: status,
        }),
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Ticket status updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Update ticket status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update ticket status",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
};