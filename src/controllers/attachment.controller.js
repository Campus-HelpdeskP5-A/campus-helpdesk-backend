const pool = require("../config/database");

/**
 * Check whether an AGENT / TECHNICIAN
 * can access a ticket.
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
 * Check whether current user can access
 * a specific ticket.
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
   * read access to all tickets.
   */
  if (
    user.role === "MANAGER" ||
    user.role === "AUDITOR"
  ) {
    return true;
  }

  /**
   * Agent / Technician:
   * directly assigned or team assigned.
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
 * GET /api/attachments/ticket/:ticketId
 *
 * Get all attachments for a ticket.
 */
const getTicketAttachments = async (
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

    const result =
      await pool.query(
        `
        SELECT
          a.attachment_id,
          a.ticket_id,
          a.uploaded_by,
          u.full_name AS uploaded_by_name,
          u.role AS uploaded_by_role,
          a.file_uuid,
          a.file_name,
          a.mime_type,
          a.file_size,
          a.storage_path,
          a.created_at

        FROM attachments a

        INNER JOIN users u
          ON u.user_id = a.uploaded_by

        WHERE a.ticket_id = $1

        ORDER BY a.created_at ASC
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
      "Get ticket attachments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get attachments",
    });
  }
};

/**
 * GET /api/attachments/:id
 *
 * Get one attachment.
 */
const getAttachmentById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result =
      await pool.query(
        `
        SELECT
          a.attachment_id,
          a.ticket_id,
          a.uploaded_by,
          u.full_name AS uploaded_by_name,
          u.role AS uploaded_by_role,
          a.file_uuid,
          a.file_name,
          a.mime_type,
          a.file_size,
          a.storage_path,
          a.created_at,

          t.reporter_id

        FROM attachments a

        INNER JOIN users u
          ON u.user_id = a.uploaded_by

        INNER JOIN tickets t
          ON t.ticket_id = a.ticket_id

        WHERE a.attachment_id = $1
        `,
        [id]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Attachment not found",
      });
    }

    const attachment =
      result.rows[0];

    /**
     * Authorization.
     */
    const hasAccess =
      await canAccessTicket(
        req.user,
        attachment.ticket_id,
        attachment.reporter_id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this attachment",
      });
    }

    delete attachment.reporter_id;

    return res.status(200).json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    console.error(
      "Get attachment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get attachment",
    });
  }
};

/**
 * POST /api/attachments
 *
 * Create attachment metadata.
 *
 * Actual file storage/upload is handled separately.
 *
 * Workflow:
 *
 * Validate access
 *      ↓
 * Create metadata
 *      ↓
 * ticket_events
 * ATTACHMENT_ADDED
 *      ↓
 * COMMIT
 */
const createAttachment = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const {
      ticket_id,
      file_uuid,
      file_name,
      mime_type,
      file_size,
      storage_path,
    } = req.body;

    /**
     * Basic validation.
     */
    if (
      !ticket_id ||
      !file_uuid ||
      !file_name ||
      file_size === undefined ||
      file_size === null ||
      !storage_path
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ticket_id, file_uuid, file_name, file_size and storage_path are required",
      });
    }

    /**
     * Validate file size.
     */
    const parsedFileSize =
      Number(file_size);

    if (
      !Number.isInteger(
        parsedFileSize
      ) ||
      parsedFileSize < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "file_size must be a non-negative integer",
      });
    }

    /**
     * Auditor is read-only.
     */
    if (req.user.role === "AUDITOR") {
      return res.status(403).json({
        success: false,
        message:
          "Auditors cannot create attachments",
      });
    }

    await client.query("BEGIN");

    /**
     * Get ticket.
     */
    const ticketResult =
      await client.query(
        `
        SELECT
          ticket_id,
          reference_number,
          reporter_id
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
     * Reporter:
     * own ticket only.
     */
    if (
      req.user.role === "REPORTER" &&
      ticket.reporter_id !==
        req.user.user_id
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to add an attachment to this ticket",
      });
    }

    /**
     * Agent / Technician:
     * assigned/team ticket only.
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
            "You do not have permission to add an attachment to this ticket",
        });
      }
    }

    /**
     * Check file_uuid uniqueness.
     */
    const existingFile =
      await client.query(
        `
        SELECT attachment_id
        FROM attachments
        WHERE file_uuid = $1
        `,
        [file_uuid]
      );

    if (
      existingFile.rows.length >
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(409).json({
        success: false,
        message:
          "An attachment with this file_uuid already exists",
      });
    }

    /**
     * Create attachment metadata.
     */
    const result =
      await client.query(
        `
        INSERT INTO attachments (
          ticket_id,
          uploaded_by,
          file_uuid,
          file_name,
          mime_type,
          file_size,
          storage_path
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        )

        RETURNING
          attachment_id,
          ticket_id,
          uploaded_by,
          file_uuid,
          file_name,
          mime_type,
          file_size,
          storage_path,
          created_at
        `,
        [
          ticket_id,
          req.user.user_id,
          file_uuid,
          file_name.trim(),
          mime_type
            ? mime_type.trim()
            : null,
          parsedFileSize,
          storage_path.trim(),
        ]
      );

    const attachment =
      result.rows[0];

    /**
     * Create business event.
     *
     * We only store metadata,
     * not the actual file contents.
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
        "ATTACHMENT_ADDED",
        req.user.user_id,
        JSON.stringify({
          attachment_id:
            attachment.attachment_id,

          file_uuid:
            attachment.file_uuid,

          file_name:
            attachment.file_name,

          mime_type:
            attachment.mime_type,

          file_size:
            attachment.file_size,
        }),
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message:
        "Attachment created successfully",
      data: attachment,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create attachment error:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "Attachment already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create attachment",
    });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/attachments/:id
 *
 * Delete attachment metadata.
 *
 * Owner or Manager only.
 *
 * Workflow:
 *
 * Delete metadata
 *      ↓
 * ticket_events
 * ATTACHMENT_DELETED
 *      ↓
 * COMMIT
 */
const deleteAttachment = async (
  req,
  res
) => {
  const client =
    await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    /**
     * Get attachment + ticket.
     */
    const result =
      await client.query(
        `
        SELECT
          a.attachment_id,
          a.ticket_id,
          a.uploaded_by,
          a.file_uuid,
          a.file_name,
          a.mime_type,
          a.file_size,

          t.reference_number,
          t.reporter_id

        FROM attachments a

        INNER JOIN tickets t
          ON t.ticket_id = a.ticket_id

        WHERE a.attachment_id = $1
        `,
        [id]
      );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message:
          "Attachment not found",
      });
    }

    const attachment =
      result.rows[0];

    /**
     * Auditor cannot delete.
     */
    if (req.user.role === "AUDITOR") {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "Auditors cannot delete attachments",
      });
    }

    /**
     * Only uploader or Manager.
     */
    if (
      req.user.role !==
        "MANAGER" &&
      attachment.uploaded_by !==
        req.user.user_id
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to delete this attachment",
      });
    }

    /**
     * Delete attachment metadata.
     */
    await client.query(
      `
      DELETE FROM attachments
      WHERE attachment_id = $1
      `,
      [id]
    );

    /**
     * Create business event.
     *
     * The actual file should be removed
     * by the storage layer separately.
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
        attachment.ticket_id,
        "ATTACHMENT_DELETED",
        req.user.user_id,
        JSON.stringify({
          attachment_id:
            attachment.attachment_id,

          file_uuid:
            attachment.file_uuid,

          file_name:
            attachment.file_name,

          file_size:
            attachment.file_size,
        }),
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Attachment deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Delete attachment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete attachment",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getTicketAttachments,
  getAttachmentById,
  createAttachment,
  deleteAttachment,
};