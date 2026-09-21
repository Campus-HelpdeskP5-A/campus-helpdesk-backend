const bcrypt = require("bcrypt");
const pool = require("../config/database");

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.user_id,
        u.email,
        u.full_name,
        r.role_name,
        u.created_at,
        u.updated_at
      FROM app_user u
      JOIN role r
        ON u.role_id = r.role_id
      ORDER BY u.created_at DESC
    `);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, full_name, role_id } = req.body;

    if (!email || !password || !full_name || !role_id) {
      return res.status(400).json({
        success: false,
        message: "email, password, full_name and role_id are required",
      });
    }

    const existingUser = await pool.query(
      `SELECT user_id FROM app_user WHERE email = $1`,
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO app_user (
        email,
        password_hash,
        full_name,
        role_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        user_id,
        email,
        full_name,
        role_id,
        created_at,
        updated_at
      `,
      [email, passwordHash, full_name, role_id]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

module.exports = {
  getUsers,
  createUser,
};