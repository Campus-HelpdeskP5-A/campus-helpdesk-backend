const pool = require("../config/database");

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const { unread } = req.query;

    let query = `
      SELECT
        n.notification_id,
        n.recipient_user_id,
        n.ticket_id,
        t.reference_number,
        n.related_user_id,
        related.full_name AS related_user_name,
        n.notification_type,
        n.title,
        n.body,
        n.is_read,
        n.read_at,
        n.created_at
      FROM notifications n
      LEFT JOIN tickets t
        ON t.ticket_id = n.ticket_id
      LEFT JOIN users related
        ON related.user_id = n.related_user_id
      WHERE n.recipient_user_id = $1
    `;

    const params = [req.user.user_id];

    if (unread === "true") {
      query += ` AND n.is_read = false`;
    }

    query += ` ORDER BY n.created_at DESC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
    });
  }
};

// GET /api/notifications/:id
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        n.notification_id,
        n.recipient_user_id,
        n.ticket_id,
        t.reference_number,
        t.title AS ticket_title,
        n.related_user_id,
        related.full_name AS related_user_name,
        n.notification_type,
        n.title,
        n.body,
        n.is_read,
        n.read_at,
        n.created_at
      FROM notifications n
      LEFT JOIN tickets t
        ON t.ticket_id = n.ticket_id
      LEFT JOIN users related
        ON related.user_id = n.related_user_id
      WHERE n.notification_id = $1
        AND n.recipient_user_id = $2
      `,
      [id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notification",
    });
  }
};

// POST /api/notifications
const createNotification = async (req, res) => {
  try {
    const {
      recipient_user_id,
      ticket_id,
      related_user_id,
      notification_type,
      title,
      body,
    } = req.body;

    if (
      !recipient_user_id ||
      !notification_type ||
      !title ||
      !body
    ) {
      return res.status(400).json({
        success: false,
        message:
          "recipient_user_id, notification_type, title and body are required",
      });
    }

    // Validate recipient
    const recipientResult = await pool.query(
      `
      SELECT
        user_id,
        is_active
      FROM users
      WHERE user_id = $1
      `,
      [recipient_user_id]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipient user not found",
      });
    }

    if (!recipientResult.rows[0].is_active) {
      return res.status(400).json({
        success: false,
        message: "Recipient user is inactive",
      });
    }

    // Validate ticket if provided
    if (ticket_id) {
      const ticketResult = await pool.query(
        `
        SELECT ticket_id
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
    }

    // Validate related user if provided
    if (related_user_id) {
      const relatedUserResult = await pool.query(
        `
        SELECT user_id
        FROM users
        WHERE user_id = $1
        `,
        [related_user_id]
      );

      if (relatedUserResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Related user not found",
        });
      }
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
      RETURNING
        notification_id,
        recipient_user_id,
        ticket_id,
        related_user_id,
        notification_type,
        title,
        body,
        is_read,
        read_at,
        created_at
      `,
      [
        recipient_user_id,
        ticket_id || null,
        related_user_id || null,
        notification_type,
        title,
        body,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create notification",
    });
  }
};

// PATCH /api/notifications/:id/read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE notifications
      SET
        is_read = true,
        read_at = NOW()
      WHERE notification_id = $1
        AND recipient_user_id = $2
      RETURNING
        notification_id,
        recipient_user_id,
        ticket_id,
        related_user_id,
        notification_type,
        title,
        body,
        is_read,
        read_at,
        created_at
      `,
      [id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

// PATCH /api/notifications/read-all
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await pool.query(
      `
      UPDATE notifications
      SET
        is_read = true,
        read_at = NOW()
      WHERE recipient_user_id = $1
        AND is_read = false
      `,
      [req.user.user_id]
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: {
        updated_count: result.rowCount,
      },
    });
  } catch (error) {
    console.error(
      "Mark all notifications as read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

module.exports = {
  getNotifications,
  getNotificationById,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};