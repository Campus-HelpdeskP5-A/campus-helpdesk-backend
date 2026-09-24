const pool = require("../config/database");

/**
 * Get all active teams for a user.
 *
 * A team is considered active for the user when:
 * - The user belongs to the team
 * - left_at IS NULL
 */
const getUserTeamIds = async (userId) => {
  const result = await pool.query(
    `
    SELECT support_team_id
    FROM user_teams
    WHERE user_id = $1
      AND left_at IS NULL
    `,
    [userId]
  );

  return result.rows.map(
    (row) => row.support_team_id
  );
};

/**
 * Check whether a user can access a specific ticket.
 *
 * Authorization rules:
 *
 * REPORTER
 * -> Own tickets only
 *
 * AGENT
 * -> Directly assigned tickets
 * -> Tickets assigned to one of their active teams
 *
 * TECHNICIAN
 * -> Directly assigned tickets
 * -> Tickets assigned to one of their active teams
 *
 * MANAGER
 * -> All tickets
 *
 * AUDITOR
 * -> All tickets (read-only is enforced by routes/controllers)
 */
const canAccessTicket = async (
  user,
  ticketId
) => {
  if (!user || !ticketId) {
    return false;
  }

  /**
   * MANAGER
   * Has access to everything.
   */
  if (user.role === "MANAGER") {
    return true;
  }

  /**
   * AUDITOR
   * Has read access to everything.
   *
   * Write restrictions are handled
   * by role middleware/routes.
   */
  if (user.role === "AUDITOR") {
    return true;
  }

  /**
   * REPORTER
   * Can only access tickets created by themselves.
   */
  if (user.role === "REPORTER") {
    const result = await pool.query(
      `
      SELECT 1
      FROM tickets
      WHERE ticket_id = $1
        AND reporter_id = $2
      LIMIT 1
      `,
      [
        ticketId,
        user.user_id,
      ]
    );

    return result.rows.length > 0;
  }

  /**
  * AGENT
  * Can also access unassigned tickets for triage.
  *
  * TECHNICIAN
   *
   * Access is based on:
   *
   * 1. Direct assignment
   *
   * OR
   *
   * 2. Current assignment to a team
   *    where the user is currently a member.
   */
  if (user.role === "AGENT" || user.role === "TECHNICIAN") {
    const result = await pool.query(
      `
      SELECT 1
      FROM tickets t

      WHERE t.ticket_id = $1

      AND (
        /**
         * Directly assigned to the user
         */
        EXISTS (
          SELECT 1
          FROM assignments a
          WHERE a.ticket_id = t.ticket_id
            AND a.is_current = true
            AND a.assigned_to = $2
        )

        OR

        /**
         * Assigned to one of the user's active teams
         */
        EXISTS (
          SELECT 1
          FROM assignments a

          INNER JOIN user_teams ut
            ON ut.support_team_id =
               a.assigned_team_id

          WHERE a.ticket_id = t.ticket_id
            AND a.is_current = true
            AND ut.user_id = $2
            AND ut.left_at IS NULL
        )

        OR

        (
          $3 = 'AGENT'
          AND NOT EXISTS (
            SELECT 1
            FROM assignments a
            WHERE a.ticket_id = t.ticket_id
              AND a.is_current = true
          )
        )
      )

      LIMIT 1
      `,
      [
        ticketId,
        user.user_id,
        user.role,
      ]
    );

    return result.rows.length > 0;
  }

  /**
   * Unknown role
   */
  return false;
};

/**
 * Build the authorization SQL condition
 * for GET /api/tickets.
 *
 * Returns:
 *
 * {
 *   clause: "...",
 *   values: [...]
 * }
 */
const getTicketAccessFilter = async (
  user
) => {
  if (!user) {
    return {
      clause: "1 = 0",
      values: [],
    };
  }

  /**
   * MANAGER
   *
   * Can see all tickets.
   */
  if (user.role === "MANAGER") {
    return {
      clause: "1 = 1",
      values: [],
    };
  }

  /**
   * AUDITOR
   *
   * Can read all tickets.
   */
  if (user.role === "AUDITOR") {
    return {
      clause: "1 = 1",
      values: [],
    };
  }

  /**
   * REPORTER
   *
   * Only own tickets.
   */
  if (user.role === "REPORTER") {
    return {
      clause: "t.reporter_id = $1",
      values: [
        user.user_id,
      ],
    };
  }

  /**
  * AGENT / TECHNICIAN
   *
   * Only:
   *
  * - Agents also see unassigned tickets for triage
  * - directly assigned tickets
   * - tickets assigned to their active teams
   */
  if (user.role === "AGENT" || user.role === "TECHNICIAN") {
    const unassignedClause =
      user.role === "AGENT"
        ? `OR NOT EXISTS (
            SELECT 1
            FROM assignments unassigned_a
            WHERE unassigned_a.ticket_id = t.ticket_id
              AND unassigned_a.is_current = true
          )`
        : "";

    return {
      clause: `
        (
          EXISTS (
            SELECT 1
            FROM assignments a
            WHERE a.ticket_id = t.ticket_id
              AND a.is_current = true
              AND a.assigned_to = $1
          )

          OR

          EXISTS (
            SELECT 1
            FROM assignments a

            INNER JOIN user_teams ut
              ON ut.support_team_id =
                 a.assigned_team_id

            WHERE a.ticket_id = t.ticket_id
              AND a.is_current = true
              AND ut.user_id = $1
              AND ut.left_at IS NULL
          )

            ${unassignedClause}
        )
      `,
      values: [
        user.user_id,
      ],
    };
  }

  /**
   * Unknown role
   */
  return {
    clause: "1 = 0",
    values: [],
  };
};

module.exports = {
  getUserTeamIds,
  canAccessTicket,
  getTicketAccessFilter,
};