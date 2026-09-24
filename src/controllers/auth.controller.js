const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const {
  ACCOUNT_STATUS,
  isActiveStatus,
} = require("../utils/accountStatus");

const register = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
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
        requested_role,
        account_status
      )
      VALUES ($1, $2, $3, 'REPORTER', 'REPORTER', $4)
      RETURNING
        user_id,
        email,
        full_name,
        role,
        (account_status = 'ACTIVE') AS is_active,
        account_status,
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
        ACCOUNT_STATUS.ACTIVE,
      ]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT
        user_id,
        email,
        password_hash,
        full_name,
        role,
        account_status
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (!isActiveStatus(user.account_status)) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.account_status === "ACTIVE",
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        user_id,
        email,
        full_name,
        role,
        (account_status = 'ACTIVE') AS is_active,
        account_status,
        approved_by,
        approved_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM users
      WHERE user_id = $1
      `,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
