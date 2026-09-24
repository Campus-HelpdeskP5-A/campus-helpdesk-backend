const pool = require("../config/database");

// GET /api/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const {
      entity_type,
      entity_id,
      actor_user_id,
      action,
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

    const conditions = [];
    const values = [];

    const addCondition = (condition, value) => {
      values.push(value);

      conditions.push(
        condition.replace(
          "?",
          `$${values.length}`
        )
      );
    };

    if (entity_type) {
      addCondition(
        "a.entity_type = ?",
        entity_type
      );
    }

    if (entity_id) {
      addCondition(
        "a.entity_id = ?",
        entity_id
      );
    }

    if (actor_user_id) {
      addCondition(
        "a.actor_user_id = ?",
        actor_user_id
      );
    }

    if (action) {
      addCondition(
        "a.action = ?",
        action
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs a ${whereClause}`,
      values
    );

    values.push(parsedLimit);
    const limitPlaceholder = `$${values.length}`;

    values.push(parsedOffset);
    const offsetPlaceholder = `$${values.length}`;

    const result = await pool.query(
      `
      SELECT
        a.audit_log_id,
        a.actor_user_id,
        actor.full_name AS actor_name,
        actor.email AS actor_email,
        a.entity_type,
        a.entity_id,
        a.action,
        a.old_values,
        a.new_values,
        a.ip_address,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users actor
        ON actor.user_id = a.actor_user_id
      ${whereClause}
      ORDER BY a.created_at DESC
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
        total: totalResult.rows[0].total,
      },
    });
  } catch (error) {
    console.error(
      "Get audit logs error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit logs",
    });
  }
};

// GET /api/audit-logs/:id
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        a.audit_log_id,
        a.actor_user_id,
        actor.full_name AS actor_name,
        actor.email AS actor_email,
        a.entity_type,
        a.entity_id,
        a.action,
        a.old_values,
        a.new_values,
        a.ip_address,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users actor
        ON actor.user_id = a.actor_user_id
      WHERE a.audit_log_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get audit log error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit log",
    });
  }
};

// POST /api/audit-logs
const createAuditLog = async (req, res) => {
  try {
    const {
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
    } = req.body;

    if (
      !entity_type ||
      !entity_id ||
      !action
    ) {
      return res.status(400).json({
        success: false,
        message:
          "entity_type, entity_id and action are required",
      });
    }

    // Validate old_values
    if (
      old_values !== undefined &&
      old_values !== null &&
      (
        typeof old_values !== "object" ||
        Array.isArray(old_values)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "old_values must be a JSON object or null",
      });
    }

    // Validate new_values
    if (
      new_values !== undefined &&
      new_values !== null &&
      (
        typeof new_values !== "object" ||
        Array.isArray(new_values)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "new_values must be a JSON object or null",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO audit_logs (
        actor_user_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        ip_address
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
        audit_log_id,
        actor_user_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        ip_address,
        created_at
      `,
      [
        req.user.user_id,
        entity_type,
        entity_id,
        action,
        old_values ?? null,
        new_values ?? null,
        req.ip || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Audit log created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Create audit log error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create audit log",
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  createAuditLog,
};