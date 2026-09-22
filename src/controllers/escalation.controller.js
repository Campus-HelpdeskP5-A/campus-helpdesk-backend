const pool = require("../config/database");

const {
  notifyEscalation,
} = require("../services/notification.service");

/**
 * GET /api/escalations/ticket/:ticketId
 *
 * Get all escalations for a ticket.
 *
 * Access:
 * - REPORTER: own tickets only
 * - AGENT: tickets they can access
 * - TECHNICIAN: tickets they can access
 * - MANAGER: all
 * - AUDITOR: all read-only
 */
const getTicketEscalations = async (
  req,
  res
) => {
  try {
    const { ticketId } = req.params;

    const ticketResult = await pool.query(
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
     * Reporter:
     * own tickets only.
     */
    if (
      req.user.role === "REPORTER" &&
      ticket.reporter_id !==
        req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this ticket",
      });
    }

    /**
     * Agent / Technician:
     *
     * Must be directly assigned to the ticket
     * or belong to the currently assigned team.
     */
    if (
      req.user.role === "AGENT" ||
      req.user.role === "TECHNICIAN"
    ) {
      const accessResult =
        await pool.query(
          `
          SELECT 1
          FROM tickets t

          WHERE t.ticket_id = $1

          AND (
            EXISTS (
              SELECT 1
              FROM assignments a
              WHERE a.ticket_id = t.ticket_id
                AND a.is_current = true
                AND a.assigned_to = $2
            )

            OR

            EXISTS (
              SELECT 1
              FROM assignments a

              INNER JOIN user_teams ut
                ON ut.support_team_id =
                   a.assigned_team_id

              WHERE a.ticket_id = t.ticket_id
                AND a.is_current = true
                AND ut.user_id = $2
                AND ut.left_at IS NULL
            )
          )

          LIMIT 1
          `,
          [
            ticketId,
            req.user.user_id,
          ]
        );

      if (accessResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to access this ticket",
        });
      }
    }

    const result = await pool.query(
      `
      SELECT
        e.escalation_id,
        e.ticket_id,
        e.trigger_type,
        e.severity,
        e.triggered_at,

        e.assigned_to,
        u.full_name AS assigned_to_name,
        u.email AS assigned_to_email,
        u.role AS assigned_to_role,

        e.assigned_team_id,
        st.team_name AS assigned_team_name,

        e.reason,
        e.resolved_at

      FROM escalations e

      LEFT JOIN users u
        ON u.user_id = e.assigned_to

      LEFT JOIN support_teams st
        ON st.support_team_id =
           e.assigned_team_id

      WHERE e.ticket_id = $1

      ORDER BY e.triggered_at ASC
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
      "Get ticket escalations error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get escalations",
    });
  }
};

/**
 * GET /api/escalations/:id
 */
const getEscalationById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        e.escalation_id,
        e.ticket_id,
        e.trigger_type,
        e.severity,
        e.triggered_at,

        e.assigned_to,
        u.full_name AS assigned_to_name,
        u.email AS assigned_to_email,
        u.role AS assigned_to_role,

        e.assigned_team_id,
        st.team_name AS assigned_team_name,

        e.reason,
        e.resolved_at,

        t.reporter_id

      FROM escalations e

      LEFT JOIN users u
        ON u.user_id = e.assigned_to

      LEFT JOIN support_teams st
        ON st.support_team_id =
           e.assigned_team_id

      INNER JOIN tickets t
        ON t.ticket_id = e.ticket_id

      WHERE e.escalation_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Escalation not found",
      });
    }

    const escalation =
      result.rows[0];

    /**
     * Reporter:
     * own ticket only.
     */
    if (
      req.user.role === "REPORTER" &&
      escalation.reporter_id !==
        req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this escalation",
      });
    }

    /**
     * Agent / Technician:
     * direct assignment or team assignment.
     */
    if (
      req.user.role === "AGENT" ||
      req.user.role === "TECHNICIAN"
    ) {
      const accessResult =
        await pool.query(
          `
          SELECT 1
          FROM tickets t

          WHERE t.ticket_id = $1

          AND (
            EXISTS (
              SELECT 1
              FROM assignments a
              WHERE a.ticket_id = t.ticket_id
                AND a.is_current = true
                AND a.assigned_to = $2
            )

            OR

            EXISTS (
              SELECT 1
              FROM assignments a

              INNER JOIN user_teams ut
                ON ut.support_team_id =
                   a.assigned_team_id

              WHERE a.ticket_id = t.ticket_id
                AND a.is_current = true
                AND ut.user_id = $2
                AND ut.left_at IS NULL
            )
          )

          LIMIT 1
          `,
          [
            escalation.ticket_id,
            req.user.user_id,
          ]
        );

      if (accessResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to access this escalation",
        });
      }
    }

    delete escalation.reporter_id;

    return res.status(200).json({
      success: true,
      data: escalation,
    });
  } catch (error) {
    console.error(
      "Get escalation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get escalation",
    });
  }
};

/**
 * POST /api/escalations
 *
 * Create escalation.
 */
const createEscalation = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const {
      ticket_id,
      trigger_type,
      severity,
      assigned_to = null,
      assigned_team_id = null,
      reason = null,
    } = req.body;

    /**
     * Basic validation.
     */
    if (
      !ticket_id ||
      !trigger_type ||
      !severity
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ticket_id, trigger_type and severity are required",
      });
    }

    if (
      !assigned_to &&
      !assigned_team_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Either assigned_to or assigned_team_id is required",
      });
    }

    /**
     * Reporters cannot create escalations.
     */
    if (req.user.role === "REPORTER") {
      return res.status(403).json({
        success: false,
        message:
          "Reporters cannot create escalations",
      });
    }

    await client.query("BEGIN");

    /**
     * 1. Get ticket.
     */
    const ticketResult =
      await client.query(
        `
        SELECT
          ticket_id,
          reference_number,
          title,
          reporter_id,
          status,
          priority
        FROM tickets
        WHERE ticket_id = $1
        `,
        [ticket_id]
      );

    if (ticketResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const ticket =
      ticketResult.rows[0];

    /**
     * 2. Agent / Technician:
     *
     * Can only escalate tickets
     * they can access.
     */
    if (
      req.user.role === "AGENT" ||
      req.user.role === "TECHNICIAN"
    ) {
      const accessResult =
        await client.query(
          `
          SELECT 1
          FROM tickets t

          WHERE t.ticket_id = $1

          AND (
            EXISTS (
              SELECT 1
              FROM assignments a
              WHERE a.ticket_id = t.ticket_id
                AND a.is_current = true
                AND a.assigned_to = $2
            )

            OR

            EXISTS (
              SELECT 1
              FROM assignments a

              INNER JOIN user_teams ut
                ON ut.support_team_id =
                   a.assigned_team_id

              WHERE a.ticket_id = t.ticket_id
                AND a.is_current = true
                AND ut.user_id = $2
                AND ut.left_at IS NULL
            )
          )

          LIMIT 1
          `,
          [
            ticket_id,
            req.user.user_id,
          ]
        );

      if (
        accessResult.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to escalate this ticket",
        });
      }
    }

    /**
     * 3. Validate assigned user.
     */
    let assignedUser = null;

    if (assigned_to) {
      const userResult =
        await client.query(
          `
          SELECT
            user_id,
            full_name,
            email,
            role,
            is_active
          FROM users
          WHERE user_id = $1
          `,
          [assigned_to]
        );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "Assigned user not found",
        });
      }

      assignedUser =
        userResult.rows[0];

      if (!assignedUser.is_active) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Assigned user is inactive",
        });
      }

      if (
        ![
          "AGENT",
          "TECHNICIAN",
          "MANAGER",
        ].includes(assignedUser.role)
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Escalation can only be assigned to an agent, technician, or manager",
        });
      }
    }

    /**
     * 4. Validate assigned team.
     */
    let assignedTeam = null;

    if (assigned_team_id) {
      const teamResult =
        await client.query(
          `
          SELECT
            support_team_id,
            team_name,
            is_active
          FROM support_teams
          WHERE support_team_id = $1
          `,
          [assigned_team_id]
        );

      if (teamResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "Assigned support team not found",
        });
      }

      assignedTeam =
        teamResult.rows[0];

      if (!assignedTeam.is_active) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Assigned support team is inactive",
        });
      }
    }

    /**
     * 5. Create escalation.
     */
    const escalationResult =
      await client.query(
        `
        INSERT INTO escalations (
          ticket_id,
          trigger_type,
          severity,
          assigned_to,
          assigned_team_id,
          reason
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )
        RETURNING
          escalation_id,
          ticket_id,
          trigger_type,
          severity,
          triggered_at,
          assigned_to,
          assigned_team_id,
          reason,
          resolved_at
        `,
        [
          ticket_id,
          trigger_type.trim(),
          severity.trim(),
          assigned_to,
          assigned_team_id,
          reason
            ? reason.trim()
            : null,
        ]
      );

    const escalation =
      escalationResult.rows[0];

    /**
     * 6. Create business event.
     */
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
        $2,
        $3,
        $4
      )
      `,
      [
        ticket_id,
        "ESCALATED",
        req.user.user_id,
        JSON.stringify({
          escalation_id:
            escalation.escalation_id,

          trigger_type:
            escalation.trigger_type,

          severity:
            escalation.severity,

          assigned_to:
            escalation.assigned_to,

          assigned_team_id:
            escalation.assigned_team_id,

          reason:
            escalation.reason,
        }),
      ]
    );

    /**
     * 7. Commit.
     */
    await client.query("COMMIT");

    /**
     * 8. Notify assigned user.
     *
     * If escalation is assigned directly
     * to a user.
     */
    if (assigned_to) {
      try {
        await notifyEscalation({
          recipientUserId:
            assigned_to,

          ticketId:
            ticket_id,

          referenceNumber:
            ticket.reference_number,

          severity:
            escalation.severity,
        });
      } catch (notificationError) {
        console.error(
          "Escalation notification error:",
          notificationError
        );
      }
    }

    return res.status(201).json({
      success: true,
      message:
        "Escalation created successfully",
      data: escalation,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create escalation error:",
      error
    );

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
        "Failed to create escalation",
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/escalations/:id/resolve
 *
 * Resolve an escalation.
 */
const resolveEscalation = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    /**
     * 1. Get escalation.
     */
    const existingResult =
      await client.query(
        `
        SELECT
          e.escalation_id,
          e.ticket_id,
          e.trigger_type,
          e.severity,
          e.assigned_to,
          e.assigned_team_id,
          e.reason,
          e.resolved_at,

          t.reference_number,
          t.reporter_id

        FROM escalations e

        INNER JOIN tickets t
          ON t.ticket_id = e.ticket_id

        WHERE e.escalation_id = $1
        `,
        [id]
      );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Escalation not found",
      });
    }

    const escalation =
      existingResult.rows[0];

    /**
     * 2. Already resolved.
     */
    if (escalation.resolved_at) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "Escalation is already resolved",
      });
    }

    /**
     * 3. Reporter cannot resolve.
     */
    if (req.user.role === "REPORTER") {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message:
          "Reporters cannot resolve escalations",
      });
    }

    /**
     * 4. Agent / Technician access check.
     */
    if (
      req.user.role === "AGENT" ||
      req.user.role === "TECHNICIAN"
    ) {
      const accessResult =
        await client.query(
          `
          SELECT 1
          FROM tickets t

          WHERE t.ticket_id = $1

          AND (
            EXISTS (
              SELECT 1
              FROM assignments a
              WHERE a.ticket_id = t.ticket_id
                AND a.is_current = true
                AND a.assigned_to = $2
            )

            OR

            EXISTS (
              SELECT 1
              FROM assignments a

              INNER JOIN user_teams ut
                ON ut.support_team_id =
                   a.assigned_team_id

              WHERE a.ticket_id = t.ticket_id
                AND a.is_current = true
                AND ut.user_id = $2
                AND ut.left_at IS NULL
            )
          )

          LIMIT 1
          `,
          [
            escalation.ticket_id,
            req.user.user_id,
          ]
        );

      if (
        accessResult.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to resolve this escalation",
        });
      }
    }

    /**
     * 5. Resolve escalation.
     */
    const result = await client.query(
      `
      UPDATE escalations
      SET resolved_at = NOW()
      WHERE escalation_id = $1
      RETURNING
        escalation_id,
        ticket_id,
        trigger_type,
        severity,
        triggered_at,
        assigned_to,
        assigned_team_id,
        reason,
        resolved_at
      `,
      [id]
    );

    /**
     * 6. Create resolution event.
     */
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
        $2,
        $3,
        $4
      )
      `,
      [
        escalation.ticket_id,
        "ESCALATION_RESOLVED",
        req.user.user_id,
        JSON.stringify({
          escalation_id:
            escalation.escalation_id,

          severity:
            escalation.severity,

          resolved_at:
            result.rows[0].resolved_at,
        }),
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Escalation resolved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Resolve escalation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to resolve escalation",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getTicketEscalations,
  getEscalationById,
  createEscalation,
  resolveEscalation,
};