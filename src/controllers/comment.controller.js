const pool = require("../config/database");

const {
  createNotification,
} = require("../services/notification.service");

/**
 * Check whether a staff user can access a ticket.
 *
 * AGENT / TECHNICIAN:
 * - directly assigned
 * - OR member of the currently assigned team
 */
const canStaffAccessTicket = async (
  userId,
  ticketId
) => {
  const result = await pool.query(
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
    [ticketId, userId]
  );

  return result.rows.length > 0;
};

/**
 * Check whether the current user can access a ticket.
 */
const canAccessTicket = async (
  user,
  ticketId,
  reporterId
) => {
  if (!user) {
    return false;
  }

  /**
   * Reporter:
   * own ticket only.
   */
  if (user.role === "REPORTER") {
    return reporterId === user.user_id;
  }

  /**
   * Manager and Auditor:
   * full read access.
   */
  if (
    user.role === "MANAGER" ||
    user.role === "AUDITOR"
  ) {
    return true;
  }

  /**
   * Agent / Technician:
   * assigned ticket/team only.
   */
  if (
    user.role === "AGENT" ||
    user.role === "TECHNICIAN"
  ) {
    return canStaffAccessTicket(
      user.user_id,
      ticketId
    );
  }

  return false;
};

/**
 * GET /api/comments/ticket/:ticketId
 *
 * Get comments for a ticket.
 *
 * Reporter:
 * - own ticket only
 * - public comments only
 *
 * Agent / Technician:
 * - assigned/team tickets
 * - all comments
 *
 * Manager / Auditor:
 * - all comments
 */
const getTicketComments = async (
  req,
  res
) => {
  try {
    const { ticketId } = req.params;

    /**
     * Check ticket.
     */
    const ticketResult =
      await pool.query(
        `
        SELECT
          ticket_id,
          reference_number,
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
        ticketId,
        ticket.reporter_id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this ticket",
      });
    }

    let query;
    let params;

    /**
     * Reporter cannot see internal comments.
     */
    if (req.user.role === "REPORTER") {
      query = `
        SELECT
          c.comment_id,
          c.ticket_id,
          c.user_id,
          u.full_name AS user_name,
          u.role AS user_role,
          c.body,
          c.is_internal,
          c.created_at,
          c.updated_at
        FROM comments c
        INNER JOIN users u
          ON u.user_id = c.user_id

        WHERE c.ticket_id = $1
          AND c.is_internal = false

        ORDER BY c.created_at ASC
      `;

      params = [ticketId];
    } else {
      query = `
        SELECT
          c.comment_id,
          c.ticket_id,
          c.user_id,
          u.full_name AS user_name,
          u.role AS user_role,
          c.body,
          c.is_internal,
          c.created_at,
          c.updated_at
        FROM comments c
        INNER JOIN users u
          ON u.user_id = c.user_id

        WHERE c.ticket_id = $1

        ORDER BY c.created_at ASC
      `;

      params = [ticketId];
    }

    const result =
      await pool.query(
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
      "Get ticket comments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get comments",
    });
  }
};

/**
 * GET /api/comments/:id
 *
 * Get a single comment.
 */
const getCommentById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.comment_id,
        c.ticket_id,
        c.user_id,
        u.full_name AS user_name,
        u.role AS user_role,
        c.body,
        c.is_internal,
        c.created_at,
        c.updated_at,
        t.reporter_id

      FROM comments c

      INNER JOIN users u
        ON u.user_id = c.user_id

      INNER JOIN tickets t
        ON t.ticket_id = c.ticket_id

      WHERE c.comment_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Comment not found",
      });
    }

    const comment =
      result.rows[0];

    /**
     * Authorization.
     */
    const hasAccess =
      await canAccessTicket(
        req.user,
        comment.ticket_id,
        comment.reporter_id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this comment",
      });
    }

    /**
     * Reporter cannot see internal comments.
     */
    if (
      req.user.role === "REPORTER" &&
      comment.is_internal
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this comment",
      });
    }

    delete comment.reporter_id;

    return res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error(
      "Get comment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get comment",
    });
  }
};

/**
 * POST /api/comments
 *
 * Create a comment.
 *
 * Workflow:
 *
 * Create comment
 *      ↓
 * ticket_events
 * COMMENT_ADDED
 *      ↓
 * COMMIT
 *      ↓
 * Notification
 */
const createComment = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const {
      ticket_id,
      body,
      is_internal = false,
    } = req.body;

    /**
     * Basic validation.
     */
    if (
      !ticket_id ||
      !body ||
      !body.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ticket_id and body are required",
      });
    }

    if (
      typeof is_internal !==
      "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "is_internal must be a boolean",
      });
    }

    /**
     * Reporter cannot create
     * internal comments.
     */
    if (
      req.user.role === "REPORTER" &&
      is_internal
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Reporters cannot create internal comments",
      });
    }

    await client.query("BEGIN");

    /**
     * Get ticket information.
     */
    const ticketResult =
      await client.query(
        `
        SELECT
          ticket_id,
          reference_number,
          title,
          reporter_id,
          status
        FROM tickets
        WHERE ticket_id = $1
        `,
        [ticket_id]
      );

    if (
      ticketResult.rows.length ===
      0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const ticket =
      ticketResult.rows[0];

    /**
     * Authorization.
     *
     * Reporter:
     * own ticket.
     *
     * Agent / Technician:
     * assigned/team ticket.
     *
     * Manager:
     * all.
     *
     * Auditor:
     * read-only.
     */
    if (
      req.user.role === "AUDITOR"
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message:
          "Auditors cannot create comments",
      });
    }

    if (
      req.user.role === "REPORTER"
    ) {
      if (
        ticket.reporter_id !==
        req.user.user_id
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to comment on this ticket",
        });
      }
    }

    /**
     * Agent / Technician access.
     *
     * We cannot use the normal pool here
     * because this operation is inside a transaction.
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
        accessResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to comment on this ticket",
        });
      }
    }

    /**
     * Create comment.
     */
    const commentResult =
      await client.query(
        `
        INSERT INTO comments (
          ticket_id,
          user_id,
          body,
          is_internal
        )
        VALUES (
          $1,
          $2,
          $3,
          $4
        )
        RETURNING
          comment_id,
          ticket_id,
          user_id,
          body,
          is_internal,
          created_at,
          updated_at
        `,
        [
          ticket_id,
          req.user.user_id,
          body.trim(),
          is_internal,
        ]
      );

    const comment =
      commentResult.rows[0];

    /**
     * Create business event.
     *
     * Important:
     * We do not put unnecessary
     * sensitive comment information
     * into the event.
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
        "COMMENT_ADDED",
        req.user.user_id,
        JSON.stringify({
          comment_id:
            comment.comment_id,

          is_internal:
            comment.is_internal,
        }),
      ]
    );

    /**
     * Commit comment + event together.
     */
    await client.query("COMMIT");

    /**
     * Notification logic.
     *
     * 1. Reporter creates comment:
     *    Notify currently assigned user.
     *
     * 2. Staff creates PUBLIC comment:
     *    Notify reporter.
     *
     * 3. Staff creates INTERNAL comment:
     *    Do NOT notify reporter.
     */
    if (
      req.user.role === "REPORTER"
    ) {
      try {
        const assignmentResult =
          await pool.query(
            `
            SELECT assigned_to
            FROM assignments
            WHERE ticket_id = $1
              AND is_current = true
              AND assigned_to IS NOT NULL
            `,
            [ticket_id]
          );

        for (
          const assignment of
            assignmentResult.rows
        ) {
          await createNotification({
            recipientUserId:
              assignment.assigned_to,

            ticketId:
              ticket_id,

            relatedUserId:
              req.user.user_id,

            notificationType:
              "COMMENT_ADDED",

            title:
              "New Ticket Comment",

            body:
              `A new comment was added to ticket ${ticket.reference_number}.`,
          });
        }
      } catch (notificationError) {
        console.error(
          "Reporter comment notification error:",
          notificationError
        );
      }
    } else if (
      !is_internal &&
      req.user.role !== "AUDITOR"
    ) {
      try {
        await createNotification({
          recipientUserId:
            ticket.reporter_id,

          ticketId:
            ticket_id,

          relatedUserId:
            req.user.user_id,

          notificationType:
            "COMMENT_ADDED",

          title:
            "New Ticket Comment",

          body:
            `A new comment was added to ticket ${ticket.reference_number}.`,
        });
      } catch (notificationError) {
        console.error(
          "Reporter notification error:",
          notificationError
        );
      }
    }

    return res.status(201).json({
      success: true,
      message:
        "Comment created successfully",
      data: comment,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create comment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create comment",
    });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/comments/:id
 *
 * Update comment.
 *
 * Owner or Manager only.
 */
const updateComment = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (
      !body ||
      !body.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "body is required",
      });
    }

    const commentResult =
      await pool.query(
        `
        SELECT
          c.comment_id,
          c.ticket_id,
          c.user_id,
          t.reporter_id

        FROM comments c

        INNER JOIN tickets t
          ON t.ticket_id =
             c.ticket_id

        WHERE c.comment_id = $1
        `,
        [id]
      );

    if (
      commentResult.rows.length ===
      0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Comment not found",
      });
    }

    const comment =
      commentResult.rows[0];

    /**
     * Auditor cannot modify.
     */
    if (
      req.user.role === "AUDITOR"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Auditors cannot update comments",
      });
    }

    /**
     * Owner or Manager.
     */
    if (
      req.user.role !==
        "MANAGER" &&
      comment.user_id !==
        req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update this comment",
      });
    }

    const result =
      await pool.query(
        `
        UPDATE comments

        SET
          body = $1,
          updated_at = NOW()

        WHERE comment_id = $2

        RETURNING
          comment_id,
          ticket_id,
          user_id,
          body,
          is_internal,
          created_at,
          updated_at
        `,
        [
          body.trim(),
          id,
        ]
      );

    return res.status(200).json({
      success: true,
      message:
        "Comment updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update comment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update comment",
    });
  }
};

/**
 * DELETE /api/comments/:id
 *
 * Delete comment.
 *
 * Owner or Manager only.
 */
const deleteComment = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const commentResult =
      await client.query(
        `
        SELECT
          c.comment_id,
          c.ticket_id,
          c.user_id,
          c.body,
          c.is_internal,
          t.reporter_id

        FROM comments c

        INNER JOIN tickets t
          ON t.ticket_id =
             c.ticket_id

        WHERE c.comment_id = $1
        `,
        [id]
      );

    if (
      commentResult.rows.length ===
      0
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Comment not found",
      });
    }

    const comment =
      commentResult.rows[0];

    /**
     * Auditor cannot delete.
     */
    if (
      req.user.role === "AUDITOR"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "Auditors cannot delete comments",
      });
    }

    /**
     * Owner or Manager.
     */
    if (
      req.user.role !==
        "MANAGER" &&
      comment.user_id !==
        req.user.user_id
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to delete this comment",
      });
    }

    /**
     * Delete comment.
     */
    await client.query(
      `
      DELETE FROM comments
      WHERE comment_id = $1
      `,
      [id]
    );

    /**
     * Create business event
     * before committing.
     *
     * We intentionally do not
     * store the complete comment body.
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
        comment.ticket_id,
        "COMMENT_DELETED",
        req.user.user_id,
        JSON.stringify({
          comment_id:
            comment.comment_id,

          is_internal:
            comment.is_internal,
        }),
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Comment deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Delete comment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete comment",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getTicketComments,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
};