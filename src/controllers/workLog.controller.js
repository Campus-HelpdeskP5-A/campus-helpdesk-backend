const pool = require("../config/database");
const { canAccessTicket } = require("../utils/accessControl");

// GET /api/work-logs/ticket/:ticketId
const getTicketWorkLogs = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { role } = req.user;

    // Check ticket existence
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

    // Check ticket access
    const hasAccess = await canAccessTicket(
      req.user,
      ticketId
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access these work logs",
      });
    }

    const result = await pool.query(
      `
      SELECT
        wl.work_log_id,
        wl.ticket_id,
        wl.user_id,
        u.full_name AS user_name,
        u.role AS user_role,
        wl.started_at,
        wl.ended_at,
        wl.time_spent_minutes,
        wl.note,
        wl.created_at
      FROM work_logs wl
      INNER JOIN users u
        ON u.user_id = wl.user_id
      WHERE wl.ticket_id = $1
      ORDER BY wl.created_at DESC
      `,
      [ticketId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Get ticket work logs error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch work logs",
    });
  }
};

// GET /api/work-logs/:id
const getWorkLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        wl.work_log_id,
        wl.ticket_id,
        wl.user_id,
        u.full_name AS user_name,
        u.role AS user_role,
        wl.started_at,
        wl.ended_at,
        wl.time_spent_minutes,
        wl.note,
        wl.created_at,
        t.reference_number,
        t.reporter_id
      FROM work_logs wl
      INNER JOIN users u
        ON u.user_id = wl.user_id
      INNER JOIN tickets t
        ON t.ticket_id = wl.ticket_id
      WHERE wl.work_log_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Work log not found",
      });
    }

    const workLog = result.rows[0];

    // Check ticket access
    const hasAccess = await canAccessTicket(
      req.user,
      workLog.ticket_id
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this work log",
      });
    }

    return res.status(200).json({
      success: true,
      data: workLog,
    });
  } catch (error) {
    console.error(
      "Get work log error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch work log",
    });
  }
};

// POST /api/work-logs
const createWorkLog = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      ticket_id,
      started_at,
      ended_at,
      time_spent_minutes,
      note,
    } = req.body;

    const { user_id, role } = req.user;

    // Only Agent, Technician and Manager can create work logs
    if (
      !["AGENT", "TECHNICIAN", "MANAGER"].includes(
        role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create work logs",
      });
    }

    // Required fields
    if (
      !ticket_id ||
      time_spent_minutes === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ticket_id and time_spent_minutes are required",
      });
    }

    // Validate time spent
    const timeSpent = Number(
      time_spent_minutes
    );

    if (
      !Number.isInteger(timeSpent) ||
      timeSpent < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "time_spent_minutes must be a non-negative integer",
      });
    }

    // Validate dates
    if (
      started_at &&
      Number.isNaN(Date.parse(started_at))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid started_at",
      });
    }

    if (
      ended_at &&
      Number.isNaN(Date.parse(ended_at))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ended_at",
      });
    }

    if (started_at && ended_at) {
      const start = new Date(started_at);
      const end = new Date(ended_at);

      if (end < start) {
        return res.status(400).json({
          success: false,
          message:
            "ended_at cannot be earlier than started_at",
        });
      }
    }

    // Check ticket access
    const hasAccess = await canAccessTicket(
      req.user,
      ticket_id
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create a work log for this ticket",
      });
    }

    await client.query("BEGIN");

    // Lock ticket row while creating the work log
    const ticketResult = await client.query(
      `
      SELECT
        ticket_id,
        reference_number
      FROM tickets
      WHERE ticket_id = $1
      FOR UPDATE
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

    const result = await client.query(
      `
      INSERT INTO work_logs (
        ticket_id,
        user_id,
        started_at,
        ended_at,
        time_spent_minutes,
        note
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        work_log_id,
        ticket_id,
        user_id,
        started_at,
        ended_at,
        time_spent_minutes,
        note,
        created_at
      `,
      [
        ticket_id,
        user_id,
        started_at || null,
        ended_at || null,
        timeSpent,
        note || null,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Work log created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create work log error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create work log",
    });
  } finally {
    client.release();
  }
};

// PUT /api/work-logs/:id
const updateWorkLog = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      started_at,
      ended_at,
      time_spent_minutes,
      note,
    } = req.body;

    const { user_id, role } = req.user;

    const existingResult = await pool.query(
      `
      SELECT
        wl.*,
        t.reference_number
      FROM work_logs wl
      INNER JOIN tickets t
        ON t.ticket_id = wl.ticket_id
      WHERE wl.work_log_id = $1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Work log not found",
      });
    }

    const existing = existingResult.rows[0];

    // User must have access to the ticket
    const hasTicketAccess =
      await canAccessTicket(
        req.user,
        existing.ticket_id
      );

    if (!hasTicketAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this work log",
      });
    }

    // Only owner or manager can update
    if (
      role !== "MANAGER" &&
      existing.user_id !== user_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update this work log",
      });
    }

    const finalStartedAt =
      started_at !== undefined
        ? started_at
        : existing.started_at;

    const finalEndedAt =
      ended_at !== undefined
        ? ended_at
        : existing.ended_at;

    const finalTimeSpent =
      time_spent_minutes !== undefined
        ? Number(time_spent_minutes)
        : existing.time_spent_minutes;

    const finalNote =
      note !== undefined
        ? note
        : existing.note;

    // Validate time
    if (
      !Number.isInteger(finalTimeSpent) ||
      finalTimeSpent < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "time_spent_minutes must be a non-negative integer",
      });
    }

    // Validate dates
    if (
      finalStartedAt &&
      Number.isNaN(
        Date.parse(finalStartedAt)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid started_at",
      });
    }

    if (
      finalEndedAt &&
      Number.isNaN(
        Date.parse(finalEndedAt)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ended_at",
      });
    }

    if (
      finalStartedAt &&
      finalEndedAt
    ) {
      const start = new Date(
        finalStartedAt
      );

      const end = new Date(
        finalEndedAt
      );

      if (end < start) {
        return res.status(400).json({
          success: false,
          message:
            "ended_at cannot be earlier than started_at",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE work_logs
      SET
        started_at = $1,
        ended_at = $2,
        time_spent_minutes = $3,
        note = $4
      WHERE work_log_id = $5
      RETURNING
        work_log_id,
        ticket_id,
        user_id,
        started_at,
        ended_at,
        time_spent_minutes,
        note,
        created_at
      `,
      [
        finalStartedAt || null,
        finalEndedAt || null,
        finalTimeSpent,
        finalNote || null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "Work log updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update work log error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update work log",
    });
  }
};

// DELETE /api/work-logs/:id
const deleteWorkLog = async (req, res) => {
  try {
    const { id } = req.params;

    const { user_id, role } = req.user;

    const existingResult = await pool.query(
      `
      SELECT
        wl.work_log_id,
        wl.ticket_id,
        wl.user_id
      FROM work_logs wl
      WHERE wl.work_log_id = $1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Work log not found",
      });
    }

    const existing =
      existingResult.rows[0];

    // User must have access to the ticket
    const hasTicketAccess =
      await canAccessTicket(
        req.user,
        existing.ticket_id
      );

    if (!hasTicketAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this work log",
      });
    }

    // Only owner or manager can delete
    if (
      role !== "MANAGER" &&
      existing.user_id !== user_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to delete this work log",
      });
    }

    await pool.query(
      `
      DELETE FROM work_logs
      WHERE work_log_id = $1
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      message:
        "Work log deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete work log error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete work log",
    });
  }
};

module.exports = {
  getTicketWorkLogs,
  getWorkLogById,
  createWorkLog,
  updateWorkLog,
  deleteWorkLog,
};