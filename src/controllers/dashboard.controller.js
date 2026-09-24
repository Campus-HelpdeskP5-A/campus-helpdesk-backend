const pool = require("../config/database");

const SLA_RISK_WINDOW_MINUTES = Number(
  process.env.SLA_RISK_WINDOW_MINUTES || 60
);

// GET /api/dashboard
// Manager only
const getDashboard = async (req, res) => {
  try {
    const [
      ticketStats,
      statusStats,
      priorityStats,
      categoryStats,
      assignmentStats,
      escalationStats,
      feedbackStats,
      slaStats,
    ] = await Promise.all([
      // 1. Overall ticket statistics
      pool.query(`
        SELECT
          COUNT(*)::int AS total,

          COUNT(*) FILTER (WHERE status = 'NEW')::int AS new,
          COUNT(*) FILTER (WHERE status = 'TRIAGED')::int AS triaged,
          COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int AS assigned,

          COUNT(*) FILTER (
            WHERE status = 'IN_PROGRESS'
          )::int AS in_progress,

          COUNT(*) FILTER (WHERE status = 'WAITING')::int AS waiting,
          COUNT(*) FILTER (WHERE status = 'REOPENED')::int AS reopened,

          COUNT(*) FILTER (
            WHERE status = 'RESOLVED'
          )::int AS resolved,

          COUNT(*) FILTER (
            WHERE status = 'CLOSED'
          )::int AS closed

        FROM tickets
      `),

      // 2. Tickets by status
      pool.query(`
        SELECT
          status,
          COUNT(*)::int AS count
        FROM tickets
        GROUP BY status
        ORDER BY count DESC
      `),

      // 3. Tickets by priority
      pool.query(`
        SELECT
          priority,
          COUNT(*)::int AS count
        FROM tickets
        GROUP BY priority
        ORDER BY count DESC
      `),

      // 4. Tickets by category
      pool.query(`
        SELECT
          c.category_id,
          c.category_name,
          COUNT(t.ticket_id)::int AS ticket_count
        FROM categories c
        LEFT JOIN tickets t
          ON t.category_id = c.category_id
        GROUP BY
          c.category_id,
          c.category_name
        ORDER BY
          ticket_count DESC,
          c.category_name
      `),

      // 5. Current assignments
      pool.query(`
        SELECT
          COUNT(*)::int AS total_current_assignments,

          COUNT(*) FILTER (
            WHERE assigned_to IS NOT NULL
          )::int AS assigned_to_users,

          COUNT(*) FILTER (
            WHERE assigned_team_id IS NOT NULL
          )::int AS assigned_to_teams

        FROM assignments
        WHERE is_current = true
      `),

      // 6. Escalations
      pool.query(`
        SELECT
          COUNT(*)::int AS total,

          COUNT(*) FILTER (
            WHERE resolved_at IS NULL
          )::int AS active,

          COUNT(*) FILTER (
            WHERE resolved_at IS NOT NULL
          )::int AS resolved

        FROM escalations
      `),

      // 7. Feedback
      pool.query(`
        SELECT
          COUNT(*)::int AS total_feedback,

          ROUND(
            AVG(rating)::numeric,
            2
          ) AS average_rating,

          COUNT(*) FILTER (
            WHERE rating = 5
          )::int AS rating_5,

          COUNT(*) FILTER (
            WHERE rating = 4
          )::int AS rating_4,

          COUNT(*) FILTER (
            WHERE rating = 3
          )::int AS rating_3,

          COUNT(*) FILTER (
            WHERE rating = 2
          )::int AS rating_2,

          COUNT(*) FILTER (
            WHERE rating = 1
          )::int AS rating_1

        FROM feedback
      `),

      // 8. SLA
      pool.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE status NOT IN (
              'RESOLVED',
              'CLOSED'
            )
            AND response_due_at < NOW()
            AND first_response_at IS NULL
          )::int AS response_sla_breached,

          COUNT(*) FILTER (
            WHERE status NOT IN (
              'RESOLVED',
              'CLOSED'
            )
            AND resolution_due_at < NOW()
          )::int AS resolution_sla_breached,

          COUNT(*) FILTER (
            WHERE status NOT IN (
              'RESOLVED',
              'CLOSED'
            )
            AND first_response_at IS NULL
            AND response_due_at >= NOW()
            AND response_due_at <= NOW() + ($1 * INTERVAL '1 minute')
          )::int AS response_sla_at_risk,

          COUNT(*) FILTER (
            WHERE status NOT IN (
              'RESOLVED',
              'CLOSED'
            )
            AND resolution_due_at >= NOW()
            AND resolution_due_at <= NOW() + ($1 * INTERVAL '1 minute')
          )::int AS resolution_sla_at_risk,

          COUNT(*) FILTER (
            WHERE status NOT IN (
              'RESOLVED',
              'CLOSED'
            )
            AND response_due_at >= NOW()
            AND resolution_due_at >= NOW()
          )::int AS within_sla

        FROM tickets
      `, [SLA_RISK_WINDOW_MINUTES]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        tickets: ticketStats.rows[0],

        tickets_by_status:
          statusStats.rows,

        tickets_by_priority:
          priorityStats.rows,

        tickets_by_category:
          categoryStats.rows,

        assignments:
          assignmentStats.rows[0],

        escalations:
          escalationStats.rows[0],

        feedback:
          feedbackStats.rows[0],

        sla:
          slaStats.rows[0],
      },
    });
  } catch (error) {
    console.error(
      "Get dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve dashboard data",
    });
  }
};

// GET /api/dashboard/team
// Agent / Technician / Manager
const getTeamDashboard = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get active teams of current user
    const teamResult = await pool.query(
      `
      SELECT
        ut.support_team_id,
        st.team_name
      FROM user_teams ut
      INNER JOIN support_teams st
        ON st.support_team_id =
           ut.support_team_id
      WHERE ut.user_id = $1
        AND ut.left_at IS NULL
        AND st.is_active = true
      ORDER BY
        ut.is_primary DESC,
        st.team_name
      `,
      [userId]
    );

    // No active teams
    if (teamResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          teams: [],

          tickets: {
            total: 0,
            new: 0,
            triaged: 0,
            assigned: 0,
            in_progress: 0,
            waiting: 0,
            resolved: 0,
            reopened: 0,
            closed: 0,
          },

          workload: [],
        },
      });
    }

    const teamIds = teamResult.rows.map(
      (team) =>
        team.support_team_id
    );

    // Team ticket statistics
    const ticketStats = await pool.query(
      `
      SELECT
        COUNT(DISTINCT t.ticket_id)::int
          AS total,

          COUNT(DISTINCT t.ticket_id) FILTER (WHERE t.status = 'NEW')::int AS new,
          COUNT(DISTINCT t.ticket_id) FILTER (WHERE t.status = 'TRIAGED')::int AS triaged,
          COUNT(DISTINCT t.ticket_id) FILTER (WHERE t.status = 'ASSIGNED')::int AS assigned,

        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status = 'IN_PROGRESS'
          )::int AS in_progress,

          COUNT(DISTINCT t.ticket_id) FILTER (WHERE t.status = 'WAITING')::int AS waiting,
          COUNT(DISTINCT t.ticket_id) FILTER (WHERE t.status = 'REOPENED')::int AS reopened,

        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status = 'RESOLVED'
          )::int AS resolved,

        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status = 'CLOSED'
          )::int AS closed

      FROM tickets t

      INNER JOIN assignments a
        ON a.ticket_id = t.ticket_id
        AND a.is_current = true

      WHERE a.assigned_team_id =
            ANY($1::uuid[])
      `,
      [teamIds]
    );

    // Technician / Agent workload
    const workload = await pool.query(
      `
      SELECT
        a.assigned_to AS user_id,
        u.full_name,
        u.role,
        COUNT(*)::int AS active_tickets

      FROM assignments a

      INNER JOIN users u
        ON u.user_id = a.assigned_to

      WHERE a.is_current = true

        AND a.assigned_team_id =
            ANY($1::uuid[])

        AND u.role IN (
          'AGENT',
          'TECHNICIAN'
        )

        AND u.account_status = 'ACTIVE'

      GROUP BY
        a.assigned_to,
        u.full_name,
        u.role

      ORDER BY
        active_tickets DESC,
        u.full_name
      `,
      [teamIds]
    );

    // Active escalations for the user's teams
    const escalationStats = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE e.resolved_at IS NULL
        )::int AS active,

        COUNT(*) FILTER (
          WHERE e.resolved_at IS NOT NULL
        )::int AS resolved

      FROM escalations e

      WHERE e.assigned_team_id =
            ANY($1::uuid[])
      `,
      [teamIds]
    );

    // Team SLA statistics
    const slaStats = await pool.query(
      `
      SELECT
        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status NOT IN (
              'RESOLVED',
              'CLOSED'
            )
            AND t.response_due_at < NOW()
            AND t.first_response_at IS NULL
          )::int AS response_sla_breached,

        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status NOT IN (
              'RESOLVED',
              'CLOSED'
            )
            AND t.resolution_due_at < NOW()
          )::int AS resolution_sla_breached,

        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status NOT IN (
              'RESOLVED',
              'CLOSED'
            )
            AND t.response_due_at >= NOW()
            AND t.resolution_due_at >= NOW()
          )::int AS within_sla

      FROM tickets t

      INNER JOIN assignments a
        ON a.ticket_id = t.ticket_id
        AND a.is_current = true

      WHERE a.assigned_team_id =
            ANY($1::uuid[])
      `,
      [teamIds]
    );

    return res.status(200).json({
      success: true,
      data: {
        teams: teamResult.rows,

        tickets:
          ticketStats.rows[0],

        workload:
          workload.rows,

        escalations:
          escalationStats.rows[0],

        sla:
          slaStats.rows[0],
      },
    });
  } catch (error) {
    console.error(
      "Get team dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve team dashboard",
    });
  }
};

const getReporterDashboard = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [ticketStats, recentTickets] = await Promise.all([
      pool.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'NEW')::int AS new,
          COUNT(*) FILTER (WHERE status = 'TRIAGED')::int AS triaged,
          COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int AS assigned,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
          COUNT(*) FILTER (WHERE status = 'WAITING')::int AS waiting,
          COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved,
          COUNT(*) FILTER (WHERE status = 'REOPENED')::int AS reopened,
          COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS closed
        FROM tickets
        WHERE reporter_id = $1
        `,
        [userId]
      ),
      pool.query(
        `
        SELECT
          t.ticket_id,
          t.reference_number,
          t.title,
          t.status,
          t.priority,
          t.created_at
        FROM tickets t
        WHERE t.reporter_id = $1
        ORDER BY t.created_at DESC
        LIMIT 10
        `,
        [userId]
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        tickets: ticketStats.rows[0],
        recent_tickets: recentTickets.rows,
      },
    });
  } catch (error) {
    console.error("Get reporter dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reporter dashboard",
    });
  }
};

const getAuditorDashboard = async (req, res) => {
  try {
    const [ticketStats, userStats, auditStats, recentLogs] = await Promise.all([
      pool.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'NEW')::int AS new,
          COUNT(*) FILTER (WHERE status = 'TRIAGED')::int AS triaged,
          COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int AS assigned,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
          COUNT(*) FILTER (WHERE status = 'WAITING')::int AS waiting,
          COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved,
          COUNT(*) FILTER (WHERE status = 'REOPENED')::int AS reopened,
          COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS closed
        FROM tickets
        `
      ),
      pool.query(
        `
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE account_status = 'ACTIVE')::int AS active_users,
          COUNT(*) FILTER (WHERE role = 'MANAGER')::int AS managers,
          COUNT(*) FILTER (WHERE role = 'TECHNICIAN')::int AS technicians
        FROM users
        `
      ),
      pool.query(
        `
        SELECT
          COUNT(*)::int AS total_logs
        FROM audit_logs
        `
      ),
      pool.query(
        `
        SELECT
          a.audit_log_id,
          a.entity_type,
          a.entity_id,
          a.action,
          a.created_at,
          actor.full_name AS actor_name
        FROM audit_logs a
        LEFT JOIN users actor ON actor.user_id = a.actor_user_id
        ORDER BY a.created_at DESC
        LIMIT 10
        `
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        tickets: ticketStats.rows[0],
        users: userStats.rows[0],
        audit_logs: auditStats.rows[0],
        recent_changes: recentLogs.rows,
      },
    });
  } catch (error) {
    console.error("Get auditor dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve auditor dashboard",
    });
  }
};

const getAgentDashboard = async (req, res) => {
  return getTeamDashboard(req, res);
};

const getTechnicianDashboard = async (req, res) => {
  return getTeamDashboard(req, res);
};

module.exports = {
  getDashboard,
  getTeamDashboard,
  getReporterDashboard,
  getAuditorDashboard,
  getAgentDashboard,
  getTechnicianDashboard,
};