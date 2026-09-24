const pool = require("../config/database");

const {
  notifyTicketAssigned,
  notifyStatusChanged,
} = require("../services/notification.service");
const {
  writeAuditLog,
} = require("../services/audit.service");
const {
  canAccessTicket,
} = require("../utils/accessControl");

/**
 * GET /api/assignments
 *
 * Access:
 * - REPORTER: assignments related to own tickets
 * - AGENT / TECHNICIAN / MANAGER / AUDITOR:
 *   all assignments
 */
const getAssignments = async (req, res) => {
  try {
    let query = `
      SELECT
        a.assignment_id,
        a.ticket_id,
        t.reference_number,

        a.assigned_to,
        assigned_user.full_name AS assigned_user_name,
        assigned_user.email AS assigned_user_email,
        assigned_user.role AS assigned_user_role,

        a.assigned_team_id,
        st.team_name,

        a.assigned_at,
        a.unassigned_at,
        a.is_current,

        a.assigned_by,
        assigner.full_name AS assigned_by_name,

        a.reason

      FROM assignments a

      INNER JOIN tickets t
        ON t.ticket_id = a.ticket_id

      LEFT JOIN users assigned_user
        ON assigned_user.user_id = a.assigned_to

      LEFT JOIN support_teams st
        ON st.support_team_id = a.assigned_team_id

      LEFT JOIN users assigner
        ON assigner.user_id = a.assigned_by
    `;

    const params = [];

    /**
     * Reporter can only see assignments
     * related to their own tickets.
     */
    if (req.user.role === "REPORTER") {
      query += `
        WHERE t.reporter_id = $1
      `;

      params.push(req.user.user_id);
    }

    query += `
      ORDER BY a.assigned_at DESC
    `;

    const result = await pool.query(
      query,
      params
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Get assignments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve assignments",
    });
  }
};

/**
 * GET /api/assignments/:id
 */
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        a.assignment_id,
        a.ticket_id,
        t.reference_number,
        t.title,
        t.reporter_id,

        a.assigned_to,
        assigned_user.full_name AS assigned_user_name,
        assigned_user.email AS assigned_user_email,
        assigned_user.role AS assigned_user_role,

        a.assigned_team_id,
        st.team_name,

        a.assigned_at,
        a.unassigned_at,
        a.is_current,

        a.assigned_by,
        assigner.full_name AS assigned_by_name,

        a.reason

      FROM assignments a

      INNER JOIN tickets t
        ON t.ticket_id = a.ticket_id

      LEFT JOIN users assigned_user
        ON assigned_user.user_id = a.assigned_to

      LEFT JOIN support_teams st
        ON st.support_team_id = a.assigned_team_id

      LEFT JOIN users assigner
        ON assigner.user_id = a.assigned_by

      WHERE a.assignment_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const assignment = result.rows[0];

    /**
     * Reporter can only access assignments
     * belonging to their own tickets.
     */
    if (
      req.user.role === "REPORTER" &&
      assignment.reporter_id !==
        req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this assignment",
      });
    }

    return res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error(
      "Get assignment by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve assignment",
    });
  }
};

/**
 * GET /api/assignments/workload
 *
 * Return active workload and a least-loaded suggestion. The caller still
 * chooses the final assignee through the assignment endpoints.
 */
const getAssignmentWorkload = async (req, res) => {
  try {
    const { support_team_id: supportTeamId } = req.query;
    const params = [];
    let teamFilter = "";

    if (supportTeamId) {
      params.push(supportTeamId);
      teamFilter = `AND EXISTS (
        SELECT 1
        FROM user_teams filter_ut
        WHERE filter_ut.user_id = u.user_id
          AND filter_ut.support_team_id = $1
          AND filter_ut.left_at IS NULL
      )`;
    }

    const result = await pool.query(
      `
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.role,
        COUNT(t.ticket_id)::int AS active_ticket_count
      FROM users u
      LEFT JOIN assignments a
        ON a.assigned_to = u.user_id
       AND a.is_current = TRUE
      LEFT JOIN tickets t
        ON t.ticket_id = a.ticket_id
       AND t.status NOT IN ('RESOLVED', 'CLOSED')
      WHERE u.role IN ('AGENT', 'TECHNICIAN')
        AND u.account_status = 'ACTIVE'
        ${teamFilter}
      GROUP BY u.user_id, u.full_name, u.email, u.role
      ORDER BY active_ticket_count ASC, u.full_name ASC
      `,
      params
    );

    return res.status(200).json({
      success: true,
      data: {
        workload: result.rows,
        suggested_assignee: result.rows[0] || null,
      },
    });
  } catch (error) {
    console.error("Get assignment workload error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignment workload",
    });
  }
};

/**
 * POST /api/assignments
 *
 * Create a new assignment.
 */
const createAssignment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      ticket_id,
      assigned_to,
      assigned_team_id,
      reason,
    } = req.body;

    /**
     * Basic validation.
     */
    if (!ticket_id) {
      return res.status(400).json({
        success: false,
        message: "ticket_id is required",
      });
    }

    if (!assigned_to && !assigned_team_id) {
      return res.status(400).json({
        success: false,
        message:
          "At least one assignment target is required: assigned_to or assigned_team_id",
      });
    }

    await client.query("BEGIN");

    /**
     * 1. Check ticket.
     */
    const ticketResult = await client.query(
      `
      SELECT
        ticket_id,
        reference_number,
        reporter_id,
        title,
        status
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

    const ticket = ticketResult.rows[0];

    if (
      req.user.role === "AGENT" &&
      !(await canAccessTicket(req.user, ticket_id))
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "You do not have access to assign this ticket",
      });
    }

    if (ticket.status !== "TRIAGED") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Tickets must be TRIAGED before they can be assigned",
      });
    }

    /**
     * 2. Validate assigned user.
     */
    let assignedUser = null;

    if (assigned_to) {
      const userResult = await client.query(
        `
        SELECT
          user_id,
          full_name,
          email,
          role,
          (account_status = 'ACTIVE') AS is_active
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
        !["AGENT", "TECHNICIAN"].includes(
          assignedUser.role
        )
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Tickets can only be assigned to an AGENT or TECHNICIAN",
        });
      }
    }

    /**
     * 3. Validate support team.
     */
    let assignedTeam = null;

    if (assigned_team_id) {
      const teamResult = await client.query(
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
            "Support team not found",
        });
      }

      assignedTeam =
        teamResult.rows[0];

      if (!assignedTeam.is_active) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message:
            "Support team is inactive",
        });
      }
    }

    /**
     * 4. Close the current assignment.
     */
    await client.query(
      `
      UPDATE assignments
      SET
        is_current = false,
        unassigned_at = NOW()
      WHERE ticket_id = $1
        AND is_current = true
      `,
      [ticket_id]
    );

    /**
     * 5. Create the new assignment.
     */
    const assignmentResult =
      await client.query(
        `
        INSERT INTO assignments (
          ticket_id,
          assigned_to,
          assigned_team_id,
          assigned_by,
          assigned_at,
          reason,
          is_current
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          NOW(),
          $5,
          true
        )
        RETURNING *
        `,
        [
          ticket_id,
          assigned_to || null,
          assigned_team_id || null,
          req.user.user_id,
          reason || null,
        ]
      );

    const assignment =
      assignmentResult.rows[0];

    /**
     * 6. A TRIAGED ticket moves to ASSIGNED,
     * move it to ASSIGNED.
     */
    const statusChanged =
      ticket.status === "TRIAGED";

    if (statusChanged) {
      await client.query(
        `
        UPDATE tickets
        SET
          status = 'ASSIGNED',
          updated_at = NOW()
        WHERE ticket_id = $1
        `,
        [ticket_id]
      );

      /**
       * Status history.
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
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )
        `,
        [
          ticket_id,
          "TRIAGED",
          "ASSIGNED",
          req.user.user_id,
          "Ticket assigned",
        ]
      );

      /**
       * Business event.
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
          "STATUS_CHANGED",
          req.user.user_id,
          JSON.stringify({
            old_status: "TRIAGED",
            new_status: "ASSIGNED",
            reason: "Ticket assigned",
          }),
        ]
      );

        await writeAuditLog({
          client,
          actorUserId: req.user.user_id,
          action: "TICKET_STATUS_CHANGED",
          entityType: "TICKET",
          entityId: ticket_id,
          oldValues: { status: "TRIAGED" },
          newValues: { status: "ASSIGNED" },
          ipAddress: req.ip,
        });
    }

    /**
     * 7. Assignment business event.
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
        "ASSIGNED",
        req.user.user_id,
        JSON.stringify({
          assignment_id:
            assignment.assignment_id,

          assigned_to:
            assignment.assigned_to,

          assigned_team_id:
            assignment.assigned_team_id,

          reason:
            assignment.reason,

          assigned_by:
            assignment.assigned_by,
        }),
      ]
    );

    /**
     * 8. Commit all DB changes.
     */
    await client.query("COMMIT");

    /**
     * 9. Send notification AFTER COMMIT.
     *
     * If notification fails,
     * the assignment remains successful.
     */
    if (assigned_to) {
      try {
        await notifyTicketAssigned({
          recipientUserId:
            assigned_to,

          ticketId:
            ticket_id,

          referenceNumber:
            ticket.reference_number,
        });
      } catch (notificationError) {
        console.error(
          "Assignment notification error:",
          notificationError
        );
      }
    }

    if (statusChanged && ticket.reporter_id) {
      try {
        await notifyStatusChanged({
          recipientUserId: ticket.reporter_id,
          ticketId: ticket_id,
          referenceNumber: ticket.reference_number,
          oldStatus: "TRIAGED",
          newStatus: "ASSIGNED",
        });
      } catch (notificationError) {
        console.error(
          "Assignment status notification error:",
          notificationError
        );
      }
    }

    return res.status(201).json({
      success: true,
      message:
        "Ticket assigned successfully",
      data: {
        assignment,
        status_changed: statusChanged,
        new_status: statusChanged
          ? "ASSIGNED"
          : ticket.status,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create assignment error:",
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
        "Failed to create assignment",
    });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/assignments/:id
 *
 * Update an assignment by closing the old one
 * and creating a new current assignment.
 */
const updateAssignment = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      assigned_to,
      assigned_team_id,
      reason,
    } = req.body;

    if (!assigned_to && !assigned_team_id) {
      return res.status(400).json({
        success: false,
        message:
          "At least one assignment target is required: assigned_to or assigned_team_id",
      });
    }

    await client.query("BEGIN");

    /**
     * 1. Find current assignment.
     */
    const currentResult =
      await client.query(
        `
        SELECT
          a.*,
          t.reference_number,
          t.title,
          t.status
        FROM assignments a

        INNER JOIN tickets t
          ON t.ticket_id = a.ticket_id

        WHERE a.assignment_id = $1
        `,
        [id]
      );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Assignment not found",
      });
    }

    const currentAssignment =
      currentResult.rows[0];

    /**
     * 2. Validate assigned user.
     */
    let assignedUser = null;

    if (assigned_to) {
      const userResult = await client.query(
        `
        SELECT
          user_id,
          full_name,
          email,
          role,
          (account_status = 'ACTIVE') AS is_active
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
        !["AGENT", "TECHNICIAN"].includes(
          assignedUser.role
        )
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Tickets can only be assigned to an AGENT or TECHNICIAN",
        });
      }
    }

    /**
     * 3. Validate support team.
     */
    let assignedTeam = null;

    if (assigned_team_id) {
      const teamResult = await client.query(
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
            "Support team not found",
        });
      }

      assignedTeam =
        teamResult.rows[0];

      if (!assignedTeam.is_active) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Support team is inactive",
        });
      }
    }

    /**
     * 4. Close old assignment.
     */
    await client.query(
      `
      UPDATE assignments
      SET
        is_current = false,
        unassigned_at = NOW()
      WHERE assignment_id = $1
      `,
      [id]
    );

    /**
     * 5. Create replacement assignment.
     */
    const result = await client.query(
      `
      INSERT INTO assignments (
        ticket_id,
        assigned_to,
        assigned_team_id,
        assigned_by,
        assigned_at,
        reason,
        is_current
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        NOW(),
        $5,
        true
      )
      RETURNING *
      `,
      [
        currentAssignment.ticket_id,
        assigned_to || null,
        assigned_team_id || null,
        req.user.user_id,
        reason || null,
      ]
    );

    const newAssignment =
      result.rows[0];

    /**
     * 6. Create assignment event.
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
        currentAssignment.ticket_id,
        "ASSIGNED",
        req.user.user_id,
        JSON.stringify({
          previous_assignment_id:
            currentAssignment.assignment_id,

          new_assignment_id:
            newAssignment.assignment_id,

          previous_assigned_to:
            currentAssignment.assigned_to,

          previous_assigned_team_id:
            currentAssignment.assigned_team_id,

          assigned_to:
            newAssignment.assigned_to,

          assigned_team_id:
            newAssignment.assigned_team_id,

          reason:
            newAssignment.reason,
        }),
      ]
    );

    await client.query("COMMIT");

    /**
     * 7. Notify new assigned user.
     */
    if (assigned_to) {
      try {
        await notifyTicketAssigned({
          recipientUserId:
            assigned_to,

          ticketId:
            currentAssignment.ticket_id,

          referenceNumber:
            currentAssignment.reference_number,
        });
      } catch (notificationError) {
        console.error(
          "Assignment update notification error:",
          notificationError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Assignment updated successfully",
      data: newAssignment,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Update assignment error:",
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
        "Failed to update assignment",
    });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/assignments/:id
 *
 * Soft delete / unassign.
 */
const removeAssignment = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    /**
     * Get assignment before closing it.
     */
    const currentResult =
      await client.query(
        `
        SELECT
          a.*,
          t.reference_number
        FROM assignments a

        INNER JOIN tickets t
          ON t.ticket_id = a.ticket_id

        WHERE a.assignment_id = $1
          AND a.is_current = true
        `,
        [id]
      );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Current assignment not found",
      });
    }

    const assignment =
      currentResult.rows[0];

    /**
     * Close assignment.
     */
    const result = await client.query(
      `
      UPDATE assignments
      SET
        is_current = false,
        unassigned_at = NOW()
      WHERE assignment_id = $1
        AND is_current = true
      RETURNING *
      `,
      [id]
    );

    /**
     * Create unassignment event.
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
        assignment.ticket_id,
        "UNASSIGNED",
        req.user.user_id,
        JSON.stringify({
          assignment_id:
            assignment.assignment_id,

          assigned_to:
            assignment.assigned_to,

          assigned_team_id:
            assignment.assigned_team_id,
        }),
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Assignment removed successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Remove assignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove assignment",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getAssignments,
  getAssignmentById,
  getAssignmentWorkload,
  createAssignment,
  updateAssignment,
  removeAssignment,
};