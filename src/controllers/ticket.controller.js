
const pool = require("../config/database");

const {
  canAccessTicket,
  canTriageTicket,
  getTicketAccessFilter,
} = require("../utils/accessControl");

const {
  VALID_TICKET_STATUSES,
  canTransition,
  canRoleTransition,
  getAllowedNextStatuses,
} = require("../utils/ticketWorkflow");

const {
  getCanonicalPriority,
} = require("../utils/priorityMatrix");

const {
  calculateSlaDueDates,
} = require("../services/sla.service");

const {
  detectEmergency,
} = require("../utils/emergency");

const {
  notifyStatusChanged,
} = require("../services/notification.service");

const {
  writeAuditLog,
} = require("../services/audit.service");

const VALID_IMPACTS = [
  "LOW",
  "MEDIUM",
  "HIGH",
];

const VALID_URGENCIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
];

const VALID_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

const VALID_STATUSES = VALID_TICKET_STATUSES;

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
      team_id,
      assignee_id,
      location_id,
      due,
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

    const accessFilter = await getTicketAccessFilter(
      req.user
    );

    const conditions = [accessFilter.clause];
    const values = [...accessFilter.values];

    /**
     * Filter by status
     */
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
          allowed_values: VALID_STATUSES,
        });
      }

      values.push(status);

      conditions.push(
        `t.status = $${values.length}`
      );
    }

    /**
     * Filter by priority
     */
    if (priority) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority value",
          allowed_values: VALID_PRIORITIES,
        });
      }

      values.push(priority);

      conditions.push(
        `t.priority = $${values.length}`
      );
    }

    /**
     * Filter by category
     */
    if (category_id) {
      values.push(category_id);

      conditions.push(
        `t.category_id = $${values.length}`
      );
    }

    /** Filter by current support team assignment */
    if (team_id) {
      values.push(team_id);
      conditions.push("EXISTS (SELECT 1 FROM assignments af WHERE af.ticket_id = t.ticket_id AND af.is_current = TRUE AND af.assigned_team_id = $" + values.length + ")");
    }

    /** Filter by current assignee */
    if (assignee_id) {
      values.push(assignee_id);
      conditions.push("EXISTS (SELECT 1 FROM assignments af WHERE af.ticket_id = t.ticket_id AND af.is_current = TRUE AND af.assigned_to = $" + values.length + ")");
    }

    /** Filter by location */
    if (location_id) {
      values.push(location_id);
      conditions.push("t.location_id = $" + values.length);
    }

    /** Filter by resolution due-time bucket */
    if (due) {
      if (!["overdue", "today", "upcoming"].includes(due)) {
        return res.status(400).json({ success: false, message: "Invalid due value", allowed_values: ["overdue", "today", "upcoming"] });
      }
      if (due === "overdue") {
        conditions.push("t.resolution_due_at < NOW() AND t.status NOT IN ('RESOLVED', 'CLOSED')");
      } else if (due === "today") {
        conditions.push("t.resolution_due_at >= CURRENT_DATE AND t.resolution_due_at < CURRENT_DATE + INTERVAL '1 day'");
      } else {
        conditions.push("t.resolution_due_at >= CURRENT_DATE + INTERVAL '1 day'");
      }
    }
    /**
     * Pagination
     */
    values.push(parsedLimit);

    const limitPlaceholder =
      `$${values.length}`;

    values.push(parsedOffset);

    const offsetPlaceholder =
      `$${values.length}`;

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

        assignment.assigned_to,
        assignee.full_name AS assignee_name,
        assignment.assigned_team_id,
        assigned_team.team_name,

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

      LEFT JOIN assignments assignment
        ON assignment.ticket_id = t.ticket_id
       AND assignment.is_current = TRUE

      LEFT JOIN users assignee
        ON assignee.user_id = assignment.assigned_to

      LEFT JOIN support_teams assigned_team
        ON assigned_team.support_team_id = assignment.assigned_team_id

      WHERE ${conditions.join(" AND ")}

      ORDER BY t.created_at DESC

      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
      `,
      values
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM tickets t
       JOIN users reporter ON reporter.user_id = t.reporter_id
       JOIN categories c ON c.category_id = t.category_id
       JOIN locations l ON l.location_id = t.location_id
       LEFT JOIN assignments assignment
         ON assignment.ticket_id = t.ticket_id
        AND assignment.is_current = TRUE
       WHERE ${conditions.join(" AND ")}`,
      values.slice(0, values.length - 2)
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        count: result.rows.length,
        total: countResult.rows[0].total,
      },
    });
  } catch (error) {
    console.error(
      "Get tickets error:",
      error
    );

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
        message:
          "You do not have access to this ticket",
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
    console.error(
      "Get ticket error:",
      error
    );

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
      attachments = [],
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
     * Validate attachments format before opening transaction
     */
    if (!Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: "attachments must be an array",
      });
    }

    const emergency = detectEmergency({
      title,
      description,
    });

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
        sp.resolution_target_minutes,
        sp.business_hours_id

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

    const calculatedPriority =
      getCanonicalPriority(
        impact,
        urgency
      );

    const now = new Date();

    const {
      responseDueAt,
      resolutionDueAt,
    } = await calculateSlaDueDates({
      client,
      businessHoursId:
        matrix.business_hours_id,
      startDate: now,
      responseTargetMinutes:
        matrix.response_target_minutes,
      resolutionTargetMinutes:
        matrix.resolution_target_minutes,
    });

    /**
     * 5. Generate reference number
     *
     * Uses PostgreSQL Sequence instead of
     * MAX(reference_number) + 1.
     *
     * This prevents race conditions when
     * multiple tickets are created concurrently.
     *
     * Example:
     * HLP-000037
     */
    const referenceResult =
      await client.query(
        `
        SELECT nextval('ticket_reference_seq') AS next_number
        `
      );

    const nextNumber =
      Number(
        referenceResult.rows[0].next_number
      );

    const referenceNumber =
      `HLP-${String(nextNumber).padStart(6, "0")}`;

    /**
     * 6. Insert ticket
     */
    const ticketResult =
      await client.query(
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
          calculatedPriority,
          "NEW",
          responseDueAt,
          resolutionDueAt,
        ]
      );

    const ticket =
      ticketResult.rows[0];

    /**
     * 7. Save initial attachment metadata
     */
    for (const attachment of attachments) {
      const {
        file_uuid,
        file_name,
        mime_type,
        file_size,
        storage_path,
      } = attachment;

      if (
        !file_uuid ||
        !file_name ||
        file_size === undefined ||
        file_size === null ||
        !storage_path
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Each attachment requires file_uuid, file_name, file_size and storage_path",
        });
      }

      if (
        !Number.isInteger(Number(file_size)) ||
        Number(file_size) < 0
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Attachment file_size must be a non-negative integer",
        });
      }

      const fileUuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!fileUuidRegex.test(file_uuid)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Attachment file_uuid must be a valid UUID",
        });
      }

      await client.query(
        `
        INSERT INTO attachments (
          ticket_id,
          uploaded_by,
          file_uuid,
          file_name,
          mime_type,
          file_size,
          storage_path,
          submitted_at,
          visibility
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          NOW(),
          'REPORTER_VISIBLE'
        )
        `,
        [
          ticket.ticket_id,
          reporterId,
          file_uuid,
          file_name,
          mime_type || null,
          Number(file_size),
          storage_path,
        ]
      );

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
          "ATTACHMENT_ADDED",
          reporterId,
          JSON.stringify({
            file_uuid,
            file_name,
            mime_type:
              mime_type || null,
            file_size:
              Number(file_size),
            storage_path,
          }),
        ]
      );
    }

    /**
     * 8. Create SLA execution
     */
    await client.query(
      `
      INSERT INTO ticket_sla_executions (
        ticket_id,
        sla_profile_id,
        response_target_minutes,
        resolution_target_minutes,
        business_hours_id,
        response_due_at,
        resolution_due_at,
        effective_from,
        is_current,
        reason,
        created_by
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
        TRUE,
        $9,
        $10
      )
      `,
      [
        ticket.ticket_id,
        matrix.sla_profile_id,
        matrix.response_target_minutes,
        matrix.resolution_target_minutes,
        matrix.business_hours_id,
        responseDueAt,
        resolutionDueAt,
        now,
        "Ticket created",
        req.user.user_id,
      ]
    );

    /**
     * 9. Create business event
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
          priority:
            ticket.priority,
          status:
            ticket.status,
        }),
      ]
    );

    /**
     * 10. Create initial status history
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
        "NEW",
        req.user.user_id,
        "Ticket created",
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message:
        "Ticket created successfully",
      data: {
        ticket,
        emergency,
        priority:
          calculatedPriority,
        attachments_count:
          attachments.length,
        sla: {
          sla_profile_id:
            matrix.sla_profile_id,

          name:
            matrix.sla_profile_name,

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
          "Ticket reference number or attachment file UUID already exists",
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
      message:
        "Failed to create ticket",
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/tickets/:id/triage
 *
 * Agent can update:
 * - category_id
 * - priority
 */
const updateTicketTriage = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      category_id,
      priority,
    } = req.body;

    /**
     * 1. Validate request
     */
    if (!category_id && !priority) {
      return res.status(400).json({
        success: false,
        message:
          "At least category_id or priority is required",
      });
    }

    /**
     * 2. Agent only
     */
    if (req.user.role !== "AGENT") {
      return res.status(403).json({
        success: false,
        message:
          "Only agents can update ticket category or priority",
      });
    }

    /**
     * 3. Check ticket triage access
     *
     * Agents are allowed to triage any existing ticket.
     */
    const access = await canTriageTicket(
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
     * 4. Get current ticket
     */
    const ticketResult =
      await client.query(
        `
      SELECT
        ticket_id,
        reference_number,
        category_id,
        priority
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

    const ticket =
      ticketResult.rows[0];

    /**
     * 5. Validate category if provided
     */
    if (category_id) {
      const categoryResult =
        await client.query(
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
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (!categoryResult.rows[0].is_active) {
        return res.status(400).json({
          success: false,
          message: "Category is inactive",
        });
      }
    }

    /**
     * 6. Validate priority if provided
     */
    if (
      priority &&
      !VALID_PRIORITIES.includes(priority)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority value",
        allowed_values:
          VALID_PRIORITIES,
      });
    }

    /**
     * 7. Start transaction
     */
    await client.query("BEGIN");

    /**
     * 8. Update ticket
     */
    const result =
      await client.query(
        `
      UPDATE tickets
      SET
        category_id = COALESCE($1, category_id),
        priority = COALESCE($2, priority),
        updated_at = NOW()
      WHERE ticket_id = $3
      RETURNING *
      `,
        [
          category_id || null,
          priority || null,
          id,
        ]
      );

    const updatedTicket =
      result.rows[0];

    /**
     * 9. Create category change event
     *
     * Only create the event when the category
     * actually changed.
     */
    if (
      category_id &&
      category_id !== ticket.category_id
    ) {
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
          "CATEGORY_CHANGED",
          req.user.user_id,
          JSON.stringify({
            reference_number:
              ticket.reference_number,

            old_category_id:
              ticket.category_id,

            new_category_id:
              updatedTicket.category_id,
          }),
        ]
      );
    }

    /**
     * 10. Create priority change event
     *
     * Only create the event when the priority
     * actually changed.
     */
    if (
      priority &&
      priority !== ticket.priority
    ) {
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
          "PRIORITY_CHANGED",
          req.user.user_id,
          JSON.stringify({
            reference_number:
              ticket.reference_number,

            old_priority:
              ticket.priority,

            new_priority:
              updatedTicket.priority,
          }),
        ]
      );
    }

    /**
     * 11. Audit log
     */
    await writeAuditLog({
      client,

      actorUserId:
        req.user.user_id,

      action:
        "TICKET_TRIAGED",

      entityType:
        "TICKET",

      entityId:
        id,

      oldValues: {
        category_id:
          ticket.category_id,

        priority:
          ticket.priority,
      },

      newValues: {
        category_id:
          updatedTicket.category_id,

        priority:
          updatedTicket.priority,
      },

      ipAddress:
        req.ip,
    });

    /**
     * 12. Commit transaction
     */
    await client.query("COMMIT");

    /**
     * 13. Response
     */
    return res.status(200).json({
      success: true,

      message:
        "Ticket triage updated successfully",

      data:
        updatedTicket,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Update ticket triage error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update ticket triage",
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/tickets/:id/status
 */
const updateTicketStatus = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const { id } = req.params;

    const {
      status,
      reason,
    } = req.body;

    /**
     * 1. Validate status
     */
    if (!status) {
      return res.status(400).json({
        success: false,
        message:
          "status is required",
      });
    }

    if (
      !VALID_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status value",
        allowed_values:
          VALID_STATUSES,
      });
    }

    /**
     * 2. Check ticket access
     */
    const access =
      await canAccessTicket(
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
    const ticketResult =
      await client.query(
        `
      SELECT *
      FROM tickets
      WHERE ticket_id = $1
      `,
        [id]
      );

    if (
      ticketResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const ticket =
      ticketResult.rows[0];

    /**
     * 4. Reporters cannot change status
     */
    if (
      req.user.role === "REPORTER"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Reporters cannot change ticket status",
      });
    }

    if (
      status === "CLOSED" &&
      ticket.status === "RESOLVED" &&
      process.env.REQUIRE_REPORTER_CONFIRMATION !==
        "false"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "The reporter must confirm resolution before the ticket can be closed",
      });
    }

    /**
     * 5. Prevent duplicate status transition
     */
    if (
      ticket.status === status
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Ticket is already in ${status} status`,
      });
    }

    if (
      !canTransition(
        ticket.status,
        status
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          `Transition from ${ticket.status} to ${status} is not allowed`,
        allowed_next_statuses:
          getAllowedNextStatuses(
            ticket.status
          ),
      });
    }

    if (
      !canRoleTransition(
        req.user.role,
        ticket.status,
        status
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          `${req.user.role} cannot transition ${ticket.status} to ${status}`,
      });
    }

    await client.query("BEGIN");

    const now =
      new Date();

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
      status === "IN_PROGRESS"
    ) {
      firstResponseAt =
        now;
    }

    /**
     * Resolution
     */
    if (
      status === "RESOLVED" &&
      !resolvedAt
    ) {
      resolvedAt =
        now;
    }

    /**
     * Closure
     */
    if (
      status === "CLOSED" &&
      !closedAt
    ) {
      closedAt =
        now;
    }

    if (
      status === "REOPENED"
    ) {
      resolvedAt = null;
      closedAt = null;
    }

    /**
     * 6. Update ticket
     */
    const result =
      await client.query(
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
        reason ||
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
          old_status:
            ticket.status,
          new_status:
            status,
          reason:
            reason ||
            "Ticket status updated",
        }),
      ]
    );

    await writeAuditLog({
      client,
      actorUserId:
        req.user.user_id,
      action:
        "TICKET_STATUS_CHANGED",
      entityType:
        "TICKET",
      entityId: id,
      oldValues: {
        status:
          ticket.status,
      },
      newValues: {
        status,
      },
      ipAddress:
        req.ip,
    });

    await client.query(
      "COMMIT"
    );

    if (ticket.reporter_id) {
      try {
        await notifyStatusChanged({
          recipientUserId:
            ticket.reporter_id,
          ticketId:
            id,
          referenceNumber:
            ticket.reference_number,
          oldStatus:
            ticket.status,
          newStatus:
            status,
        });
      } catch (
        notificationError
      ) {
        console.error(
          "Status notification error:",
          notificationError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Ticket status updated successfully",
      data:
        result.rows[0],
    });
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

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

/**
 * POST /api/tickets/:id/confirm-resolution
 *
 * A reporter confirms a resolved ticket and closes it.
 */
const confirmResolution = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const { id } =
      req.params;

    const ticketResult =
      await client.query(
        `
      SELECT
        ticket_id,
        reporter_id,
        reference_number,
        status
      FROM tickets
      WHERE ticket_id = $1
      `,
        [id]
      );

    if (
      ticketResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Ticket not found",
      });
    }

    const ticket =
      ticketResult.rows[0];

    if (
      ticket.reporter_id !==
      req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the ticket reporter can confirm resolution",
      });
    }

    if (
      ticket.status !==
      "RESOLVED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Only resolved tickets can be confirmed",
      });
    }

    await client.query(
      "BEGIN"
    );

    const result =
      await client.query(
        `
      UPDATE tickets
      SET
        status = 'CLOSED',
        closed_at = NOW(),
        updated_at = NOW()
      WHERE ticket_id = $1
      RETURNING *
      `,
        [id]
      );

    await client.query(
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
        'RESOLVED',
        'CLOSED',
        $2,
        $3
      )
      `,
      [
        id,
        req.user.user_id,
        "Resolution confirmed by reporter",
      ]
    );

    await client.query(
      `
      INSERT INTO ticket_events (
        ticket_id,
        event_type,
        actor_user_id,
        event_data
      )
      VALUES (
        $1,
        'STATUS_CHANGED',
        $2,
        $3::jsonb
      )
      `,
      [
        id,
        req.user.user_id,
        JSON.stringify({
          old_status:
            "RESOLVED",
          new_status:
            "CLOSED",
          reason:
            "Resolution confirmed by reporter",
        }),
      ]
    );

    await writeAuditLog({
      client,
      actorUserId:
        req.user.user_id,
      action:
        "TICKET_STATUS_CHANGED",
      entityType:
        "TICKET",
      entityId: id,
      oldValues: {
        status:
          "RESOLVED",
      },
      newValues: {
        status:
          "CLOSED",
      },
      ipAddress:
        req.ip,
    });

    await client.query(
      "COMMIT"
    );

    try {
      await notifyStatusChanged({
        recipientUserId:
          req.user.user_id,
        ticketId:
          id,
        referenceNumber:
          ticket.reference_number,
        oldStatus:
          "RESOLVED",
        newStatus:
          "CLOSED",
      });
    } catch (
      notificationError
    ) {
      console.error(
        "Confirmation notification error:",
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Resolution confirmed successfully",
      data:
        result.rows[0],
    });
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Confirm resolution error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to confirm resolution",
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/tickets/:id/reopen
 *
 * A reporter can reopen a resolved ticket during the configured window.
 */
const reopenTicket = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const { id } =
      req.params;

    const reopenWindowDays =
      Number(
        process.env.TICKET_REOPEN_WINDOW_DAYS ||
          7
      );

    const ticketResult =
      await client.query(
        `
      SELECT
        ticket_id,
        reporter_id,
        reference_number,
        status,
        resolved_at
      FROM tickets
      WHERE ticket_id = $1
      `,
        [id]
      );

    if (
      ticketResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Ticket not found",
      });
    }

    const ticket =
      ticketResult.rows[0];

    if (
      ticket.reporter_id !==
      req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the ticket reporter can reopen this ticket",
      });
    }

    if (
      ![
        "RESOLVED",
        "CLOSED",
      ].includes(ticket.status)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Only resolved or closed tickets can be reopened",
      });
    }

    const oldStatus =
      ticket.status;

    const resolvedAt =
      ticket.resolved_at
        ? new Date(
            ticket.resolved_at
          ).getTime()
        : NaN;

    const windowMilliseconds =
      reopenWindowDays *
      24 *
      60 *
      60 *
      1000;

    if (
      !Number.isFinite(
        resolvedAt
      ) ||
      Date.now() -
        resolvedAt >
          windowMilliseconds
    ) {
      return res.status(409).json({
        success: false,
        message:
          "The ticket reopening period has expired",
        reopening_period_days:
          reopenWindowDays,
      });
    }

    await client.query(
      "BEGIN"
    );

    const result =
      await client.query(
        `
      UPDATE tickets
      SET
        status = 'REOPENED',
        resolved_at = NULL,
        closed_at = NULL,
        updated_at = NOW()
      WHERE ticket_id = $1
      RETURNING *
      `,
        [id]
      );

    await client.query(
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
        'REOPENED',
        $3,
        $4
      )
      `,
      [
        id,
        oldStatus,
        req.user.user_id,
        req.body.reason ||
          "Ticket reopened by reporter",
      ]
    );

    await client.query(
      `
      INSERT INTO ticket_events (
        ticket_id,
        event_type,
        actor_user_id,
        event_data
      )
      VALUES (
        $1,
        'REOPENED',
        $2,
        $3::jsonb
      )
      `,
      [
        id,
        req.user.user_id,
        JSON.stringify({
          old_status:
            oldStatus,
          new_status:
            "REOPENED",
          reason:
            req.body.reason ||
            "Ticket reopened by reporter",
        }),
      ]
    );

    await writeAuditLog({
      client,
      actorUserId:
        req.user.user_id,
      action:
        "TICKET_STATUS_CHANGED",
      entityType:
        "TICKET",
      entityId: id,
      oldValues: {
        status:
          oldStatus,
      },
      newValues: {
        status:
          "REOPENED",
      },
      ipAddress:
        req.ip,
    });

    await client.query(
      "COMMIT"
    );

    try {
      await notifyStatusChanged({
        recipientUserId:
          req.user.user_id,
        ticketId:
          id,
        referenceNumber:
          ticket.reference_number,
        oldStatus,
        newStatus:
          "REOPENED",
      });
    } catch (
      notificationError
    ) {
      console.error(
        "Reopen ticket notification error:",
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Ticket reopened successfully",
      data:
        result.rows[0],
    });
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Reopen ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to reopen ticket",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketTriage,
  updateTicketStatus,
  confirmResolution,
  reopenTicket,
};
