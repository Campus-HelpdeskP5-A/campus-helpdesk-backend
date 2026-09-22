const bcrypt = require("bcrypt");
const pool = require("../config/database");

const VALID_ROLES = [
  "REPORTER",
  "AGENT",
  "TECHNICIAN",
  "MANAGER",
  "AUDITOR",
];

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        user_id,
        email,
        full_name,
        role,
        is_active,
        approved_by,
        approved_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        user_id,
        email,
        full_name,
        role,
        is_active,
        approved_by,
        approved_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM users
      WHERE user_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get user by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      role,
    } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "password must be at least 8 characters",
      });
    }

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "full_name is required",
      });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      `
      SELECT user_id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        email,
        password_hash,
        full_name,
        role,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING
        user_id,
        email,
        full_name,
        role,
        is_active,
        approved_by,
        approved_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      `,
      [
        normalizedEmail,
        passwordHash,
        full_name.trim(),
        role,
        req.user.user_id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      email,
      full_name,
      role,
      is_active,
    } = req.body;

    const existingUser = await pool.query(
      `
      SELECT user_id
      FROM users
      WHERE user_id = $1
      `,
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email !== undefined && !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "email cannot be empty",
      });
    }

    if (full_name !== undefined && !full_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "full_name cannot be empty",
      });
    }

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    if (email !== undefined) {
      const duplicateUser = await pool.query(
        `
        SELECT user_id
        FROM users
        WHERE LOWER(email) = LOWER($1)
          AND user_id <> $2
        `,
        [email.trim().toLowerCase(), id]
      );

      if (duplicateUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        email = COALESCE($1, email),
        full_name = COALESCE($2, full_name),
        role = COALESCE($3, role),
        is_active = COALESCE($4, is_active),
        updated_by = $5,
        updated_at = NOW()
      WHERE user_id = $6
      RETURNING
        user_id,
        email,
        full_name,
        role,
        is_active,
        approved_by,
        approved_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      `,
      [
        email !== undefined ? email.trim().toLowerCase() : null,
        full_name !== undefined ? full_name.trim() : null,
        role !== undefined ? role : null,
        is_active !== undefined ? is_active : null,
        req.user.user_id,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        is_active = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE user_id = $3
      RETURNING
        user_id,
        email,
        full_name,
        role,
        is_active,
        approved_by,
        approved_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      `,
      [is_active, req.user.user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: is_active
        ? "User activated successfully"
        : "User deactivated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update user status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
};