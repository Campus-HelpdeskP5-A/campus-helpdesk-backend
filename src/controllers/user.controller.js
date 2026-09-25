
const bcrypt = require("bcrypt");
const pool = require("../config/database");
const {
  ACCOUNT_STATUS,
  isActiveStatus,
  isPendingApprovalStatus,
} = require("../utils/accountStatus");

const VALID_ROLES = [
  "REPORTER",
  "AGENT",
  "TECHNICIAN",
  "MANAGER",
  "AUDITOR",
];

const APPROVAL_ROLES = [
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
        (account_status = 'ACTIVE') AS is_active,
        account_status,
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

    /*
     * REPORTER accounts are active immediately.
     *
     * AGENT, TECHNICIAN, MANAGER and AUDITOR accounts
     * require Manager approval before activation.
     */
    const accountStatus = APPROVAL_ROLES.includes(role)
      ? ACCOUNT_STATUS.PENDING_APPROVAL
      : ACCOUNT_STATUS.ACTIVE;

    const result = await pool.query(
      `
      INSERT INTO users (
        email,
        password_hash,
        full_name,
        role,
        requested_role,
        account_status,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $4, $5, $6, $6)
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
        role,
        accountStatus,
        req.user.user_id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: isPendingApprovalStatus(accountStatus)
        ? "User created successfully and is pending Manager approval"
        : "User created successfully",
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
      SELECT
        user_id,
        role,
        account_status
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

    const currentUser = existingUser.rows[0];

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
        [
          email.trim().toLowerCase(),
          id,
        ]
      );

      if (duplicateUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }
    }

    const newRole =
      role !== undefined
        ? role
        : currentUser.role;

    /*
     * Prevent bypassing the approval workflow.
     *
     * Any approval-required role cannot be activated directly
     * through updateUser while it is still pending approval.
     */
    if (
      APPROVAL_ROLES.includes(newRole) &&
      is_active === true &&
      !isActiveStatus(currentUser.account_status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This account requires Manager approval before activation",
      });
    }

    /*
     * If a user is changed to an approval-required role,
     * the account becomes PENDING_APPROVAL.
     */
    const roleChangedToApprovalRole =
      role !== undefined &&
      role !== currentUser.role &&
      APPROVAL_ROLES.includes(newRole);

    /*
     * If a user is changed from an approval-required role
     * to REPORTER, the account can become ACTIVE.
     */
    const roleChangedToReporter =
      role !== undefined &&
      role !== currentUser.role &&
      newRole === "REPORTER";

    let accountStatus = null;

    if (roleChangedToApprovalRole) {
      accountStatus = ACCOUNT_STATUS.PENDING_APPROVAL;
    } else if (roleChangedToReporter) {
      accountStatus = ACCOUNT_STATUS.ACTIVE;
    } else if (is_active !== undefined) {
      accountStatus = is_active
        ? ACCOUNT_STATUS.ACTIVE
        : ACCOUNT_STATUS.SUSPENDED;
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        email = COALESCE($1, email),
        full_name = COALESCE($2, full_name),
        role = COALESCE($3, role),
        account_status = COALESCE($4, account_status),
        updated_by = $5,
        updated_at = NOW()
      WHERE user_id = $6
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
        email !== undefined
          ? email.trim().toLowerCase()
          : null,
        full_name !== undefined
          ? full_name.trim()
          : null,
        role !== undefined
          ? role
          : null,
        accountStatus,
        req.user.user_id,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        roleChangedToApprovalRole
          ? "User updated successfully and is pending Manager approval"
          : "User updated successfully",
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

    const existingUser = await pool.query(
      `
      SELECT
        user_id,
        role,
        account_status,
        approved_by,
        approved_at
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

    const user = existingUser.rows[0];

    /*
     * Any approval-required role that is still pending
     * must go through the approval workflow.
     */
    if (
      is_active === true &&
      APPROVAL_ROLES.includes(user.role) &&
      isPendingApprovalStatus(user.account_status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This account must be approved through the approval workflow before activation",
      });
    }

    /*
     * A previously approved account that is SUSPENDED
     * can be reactivated by a Manager without a new approval.
     */
    const result = await pool.query(
      `
      UPDATE users
      SET
        account_status = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE user_id = $3
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
        is_active
          ? ACCOUNT_STATUS.ACTIVE
          : ACCOUNT_STATUS.SUSPENDED,
        req.user.user_id,
        id,
      ]
    );

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

/**
 * Approve a pending AGENT, TECHNICIAN, MANAGER or AUDITOR account.
 *
 * Only a Manager can access this endpoint.
 * The route-level authorization is added in user.routes.js.
 */
const approveUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const existingUser = await client.query(
      `
      SELECT
        user_id,
        email,
        full_name,
        role,
        account_status
      FROM users
      WHERE user_id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (existingUser.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = existingUser.rows[0];

    /*
     * Only approval-required roles can be approved.
     */
    if (!APPROVAL_ROLES.includes(user.role)) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "Only Agent, Technician, Manager and Auditor accounts require approval",
      });
    }

    /*
     * Only PENDING accounts can be approved.
     */
    if (!isPendingApprovalStatus(user.account_status)) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          `User cannot be approved because account status is ${user.account_status}`,
      });
    }

    const result = await client.query(
      `
      UPDATE users
      SET
        account_status = $3,
        approved_by = $1,
        approved_at = NOW(),
        updated_by = $1,
        updated_at = NOW()
      WHERE user_id = $2
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
        req.user.user_id,
        id,
        ACCOUNT_STATUS.ACTIVE,
      ]
    );

    /*
     * Automatically create an audit log for the approval.
     */
    await client.query(
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
      `,
      [
        req.user.user_id,
        "USER",
        id,
        "USER_APPROVED",
        {
          account_status: user.account_status,
          role: user.role,
        },
        {
          account_status: "ACTIVE",
          role: user.role,
          approved_by: req.user.user_id,
        },
        req.ip || null,
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "User approved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Approve user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve user",
    });
  } finally {
    client.release();
  }
};


/**
 * GET /api/users/pending
 * Manager-only list of accounts waiting for approval.
 */
const getPendingUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        user_id,
        email,
        full_name,
        role,
        requested_role,
        account_status,
        created_at
      FROM users
      WHERE account_status = 'PENDING_APPROVAL'
      ORDER BY created_at ASC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get pending users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending users",
    });
  }
};

/**
 * GET /api/users/technicians
 * Returns active technicians with their current open workload.
 */
const getTechnicians = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.user_id,
        u.email,
        u.full_name,
        u.role,
        COUNT(
          CASE
            WHEN t.status IN ('ASSIGNED', 'IN_PROGRESS', 'WAITING')
            THEN 1
          END
        )::int AS workload
      FROM users u
      LEFT JOIN assignments a
        ON a.assigned_to = u.user_id
       AND a.is_current = TRUE
      LEFT JOIN tickets t
        ON t.ticket_id = a.ticket_id
      WHERE u.role = 'TECHNICIAN'
        AND u.account_status = 'ACTIVE'
      GROUP BY u.user_id, u.email, u.full_name, u.role
      ORDER BY workload ASC, u.full_name ASC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get technicians error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve technicians",
    });
  }
};

module.exports = {
  getUsers,
  getPendingUsers,
  getTechnicians,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  approveUser,
};

