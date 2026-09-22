const pool = require("../config/database");

const getSupportTeams = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        support_team_id,
        team_name,
        description,
        is_active,
        created_at,
        updated_at
      FROM support_teams
      ORDER BY team_name ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get support teams error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve support teams",
    });
  }
};

const getSupportTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        support_team_id,
        team_name,
        description,
        is_active,
        created_at,
        updated_at
      FROM support_teams
      WHERE support_team_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Support team not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get support team by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve support team",
    });
  }
};

const createSupportTeam = async (req, res) => {
  try {
    const { team_name, description } = req.body;

    if (!team_name || !team_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "team_name is required",
      });
    }

    const existingTeam = await pool.query(
      `
      SELECT support_team_id
      FROM support_teams
      WHERE LOWER(team_name) = LOWER($1)
      `,
      [team_name.trim()]
    );

    if (existingTeam.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Support team already exists",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO support_teams (
        team_name,
        description
      )
      VALUES ($1, $2)
      RETURNING
        support_team_id,
        team_name,
        description,
        is_active,
        created_at,
        updated_at
      `,
      [
        team_name.trim(),
        description?.trim() || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Support team created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create support team error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create support team",
    });
  }
};

const updateSupportTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { team_name, description, is_active } = req.body;

    const existingTeam = await pool.query(
      `
      SELECT support_team_id
      FROM support_teams
      WHERE support_team_id = $1
      `,
      [id]
    );

    if (existingTeam.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Support team not found",
      });
    }

    if (team_name !== undefined && !team_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "team_name cannot be empty",
      });
    }

    if (team_name !== undefined) {
      const duplicateTeam = await pool.query(
        `
        SELECT support_team_id
        FROM support_teams
        WHERE LOWER(team_name) = LOWER($1)
          AND support_team_id <> $2
        `,
        [team_name.trim(), id]
      );

      if (duplicateTeam.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Support team already exists",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE support_teams
      SET
        team_name = COALESCE($1, team_name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE support_team_id = $4
      RETURNING
        support_team_id,
        team_name,
        description,
        is_active,
        created_at,
        updated_at
      `,
      [
        team_name !== undefined ? team_name.trim() : null,
        description !== undefined ? description.trim() : null,
        is_active !== undefined ? is_active : null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Support team updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update support team error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update support team",
    });
  }
};

module.exports = {
  getSupportTeams,
  getSupportTeamById,
  createSupportTeam,
  updateSupportTeam,
};