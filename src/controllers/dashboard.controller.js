const pool = require("../config/database");

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

          COUNT(*) FILTER (
            WHERE status = 'OPEN'
          )::int AS open,

          COUNT(*) FILTER (
            WHERE status = 'IN_PROGRESS'
          )::int AS in_progress,

          COUNT(*) FILTER (
            WHERE status = 'PENDING'
          )::int AS pending,

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
            AND response_due_at >= NOW()
            AND resolution_due_at >= NOW()
          )::int AS within_sla

        FROM tickets
      `),
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
            open: 0,
            in_progress: 0,
            pending: 0,
            resolved: 0,
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

        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status = 'OPEN'
          )::int AS open,

        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status = 'IN_PROGRESS'
          )::int AS in_progress,

        COUNT(DISTINCT t.ticket_id)
          FILTER (
            WHERE t.status = 'PENDING'
          )::int AS pending,

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

        AND u.is_active = true

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

module.exports = {
  getDashboard,
  getTeamDashboard,
};