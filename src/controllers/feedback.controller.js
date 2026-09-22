const pool = require("../config/database");
const { canAccessTicket } = require("../utils/accessControl");

// GET /api/feedback/ticket/:ticketId
const getTicketFeedback = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticketResult = await pool.query(
      `
      SELECT
        ticket_id,
        reporter_id,
        status
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

    const hasAccess = await canAccessTicket(
      req.user,
      ticketId
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this ticket",
      });
    }

    const result = await pool.query(
      `
      SELECT
        f.feedback_id,
        f.ticket_id,
        f.user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        f.rating,
        f.comment,
        f.created_at
      FROM feedback f
      INNER JOIN users u
        ON u.user_id = f.user_id
      WHERE f.ticket_id = $1
      ORDER BY f.created_at DESC
      `,
      [ticketId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get ticket feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ticket feedback",
    });
  }
};

// GET /api/feedback/:id
const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        f.feedback_id,
        f.ticket_id,
        f.user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        f.rating,
        f.comment,
        f.created_at,
        t.reference_number,
        t.title AS ticket_title,
        t.status AS ticket_status
      FROM feedback f
      INNER JOIN users u
        ON u.user_id = f.user_id
      INNER JOIN tickets t
        ON t.ticket_id = f.ticket_id
      WHERE f.feedback_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    const feedback = result.rows[0];

    const hasAccess = await canAccessTicket(
      req.user,
      feedback.ticket_id
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this feedback",
      });
    }

    return res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error("Get feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve feedback",
    });
  }
};

// POST /api/feedback
const createFeedback = async (req, res) => {
  try {
    const {
      ticket_id,
      rating,
      comment,
    } = req.body;

    if (!ticket_id) {
      return res.status(400).json({
        success: false,
        message: "ticket_id is required",
      });
    }

    if (rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        message: "rating is required",
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "rating must be an integer between 1 and 5",
      });
    }

    const ticketResult = await pool.query(
      `
      SELECT
        ticket_id,
        reporter_id,
        status,
        reference_number
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

    const ticket = ticketResult.rows[0];

    // Only the reporter can submit feedback
    if (ticket.reporter_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: "Only the ticket reporter can submit feedback",
      });
    }

    // Feedback only after resolution
    if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Feedback can only be submitted for a resolved or closed ticket",
      });
    }

    const existingFeedback = await pool.query(
      `
      SELECT feedback_id
      FROM feedback
      WHERE ticket_id = $1
        AND user_id = $2
      `,
      [ticket_id, req.user.user_id]
    );

    if (existingFeedback.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "You have already submitted feedback for this ticket",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const feedbackResult = await client.query(
        `
        INSERT INTO feedback (
          ticket_id,
          user_id,
          rating,
          comment
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          feedback_id,
          ticket_id,
          user_id,
          rating,
          comment,
          created_at
        `,
        [
          ticket_id,
          req.user.user_id,
          numericRating,
          comment !== undefined ? comment : null,
        ]
      );

      const feedback = feedbackResult.rows[0];

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
          'FEEDBACK_CREATED',
          $2,
          $3::jsonb
        )
        `,
        [
          ticket_id,
          req.user.user_id,
          JSON.stringify({
            feedback_id: feedback.feedback_id,
            rating: numericRating,
          }),
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Feedback submitted successfully",
        data: feedback,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message:
            "You have already submitted feedback for this ticket",
        });
      }

      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
    });
  }
};

// PUT /api/feedback/:id
const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (
      rating === undefined &&
      comment === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "rating or comment is required",
      });
    }

    let numericRating = null;

    if (rating !== undefined) {
      numericRating = Number(rating);

      if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "rating must be an integer between 1 and 5",
        });
      }
    }

    const existingResult = await pool.query(
      `
      SELECT
        feedback_id,
        ticket_id,
        user_id,
        rating,
        comment
      FROM feedback
      WHERE feedback_id = $1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    const feedback = existingResult.rows[0];

    const hasTicketAccess = await canAccessTicket(
      req.user,
      feedback.ticket_id
    );

    if (!hasTicketAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this feedback",
      });
    }

    if (
      feedback.user_id !== req.user.user_id &&
      req.user.role !== "MANAGER"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update this feedback",
      });
    }

    // Important:
    // Undefined means "keep old value".
    // Explicit null for comment means "clear comment".
    const newRating =
      rating !== undefined
        ? numericRating
        : feedback.rating;

    const newComment =
      comment !== undefined
        ? comment
        : feedback.comment;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
        UPDATE feedback
        SET
          rating = $1,
          comment = $2
        WHERE feedback_id = $3
        RETURNING
          feedback_id,
          ticket_id,
          user_id,
          rating,
          comment,
          created_at
        `,
        [
          newRating,
          newComment,
          id,
        ]
      );

      const updatedFeedback = result.rows[0];

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
          'FEEDBACK_UPDATED',
          $2,
          $3::jsonb
        )
        `,
        [
          feedback.ticket_id,
          req.user.user_id,
          JSON.stringify({
            feedback_id: id,
            old_rating: feedback.rating,
            new_rating: newRating,
          }),
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Feedback updated successfully",
        data: updatedFeedback,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update feedback",
    });
  }
};

// DELETE /api/feedback/:id
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await pool.query(
      `
      SELECT
        feedback_id,
        ticket_id,
        user_id,
        rating
      FROM feedback
      WHERE feedback_id = $1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    const feedback = existingResult.rows[0];

    const hasTicketAccess = await canAccessTicket(
      req.user,
      feedback.ticket_id
    );

    if (!hasTicketAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this feedback",
      });
    }

    if (
      feedback.user_id !== req.user.user_id &&
      req.user.role !== "MANAGER"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to delete this feedback",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        DELETE FROM feedback
        WHERE feedback_id = $1
        `,
        [id]
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
          'FEEDBACK_DELETED',
          $2,
          $3::jsonb
        )
        `,
        [
          feedback.ticket_id,
          req.user.user_id,
          JSON.stringify({
            feedback_id: id,
            rating: feedback.rating,
          }),
        ]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "Feedback deleted successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete feedback",
    });
  }
};

module.exports = {
  getTicketFeedback,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
};