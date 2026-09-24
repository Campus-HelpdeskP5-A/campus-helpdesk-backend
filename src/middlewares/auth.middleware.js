const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const {
  isActiveStatus,
} = require("../utils/accountStatus");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required",
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `
      SELECT
        user_id,
        email,
        full_name,
        role,
        account_status
      FROM users
      WHERE user_id = $1
      `,
      [decoded.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
      });
    }

    const user = result.rows[0];

    if (!isActiveStatus(user.account_status)) {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    req.user = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      account_status: user.account_status,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authenticate;