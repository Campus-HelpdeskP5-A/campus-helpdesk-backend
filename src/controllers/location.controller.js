const pool = require("../config/database");

const getLocations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        location_id,
        building,
        floor,
        room_code,
        description,
        created_at,
        updated_at
      FROM locations
      ORDER BY building ASC, room_code ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get locations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve locations",
    });
  }
};

const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        location_id,
        building,
        floor,
        room_code,
        description,
        created_at,
        updated_at
      FROM locations
      WHERE location_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get location by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve location",
    });
  }
};

const createLocation = async (req, res) => {
  try {
    const {
      building,
      floor,
      room_code,
      description,
    } = req.body;

    if (!building || !building.trim()) {
      return res.status(400).json({
        success: false,
        message: "building is required",
      });
    }

    if (!room_code || !room_code.trim()) {
      return res.status(400).json({
        success: false,
        message: "room_code is required",
      });
    }

    const existingLocation = await pool.query(
      `
      SELECT location_id
      FROM locations
      WHERE LOWER(building) = LOWER($1)
        AND LOWER(room_code) = LOWER($2)
      `,
      [building.trim(), room_code.trim()]
    );

    if (existingLocation.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Location already exists",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO locations (
        building,
        floor,
        room_code,
        description
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        location_id,
        building,
        floor,
        room_code,
        description,
        created_at,
        updated_at
      `,
      [
        building.trim(),
        floor?.trim() || null,
        room_code.trim(),
        description?.trim() || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create location error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create location",
    });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      building,
      floor,
      room_code,
      description,
    } = req.body;

    const existingLocation = await pool.query(
      `
      SELECT location_id
      FROM locations
      WHERE location_id = $1
      `,
      [id]
    );

    if (existingLocation.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    if (building !== undefined && !building.trim()) {
      return res.status(400).json({
        success: false,
        message: "building cannot be empty",
      });
    }

    if (room_code !== undefined && !room_code.trim()) {
      return res.status(400).json({
        success: false,
        message: "room_code cannot be empty",
      });
    }

    const duplicateLocation = await pool.query(
      `
      SELECT location_id
      FROM locations
      WHERE LOWER(building) = LOWER(COALESCE($1, building))
        AND LOWER(room_code) = LOWER(COALESCE($2, room_code))
        AND location_id <> $3
      `,
      [
        building !== undefined ? building.trim() : null,
        room_code !== undefined ? room_code.trim() : null,
        id,
      ]
    );

    if (duplicateLocation.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Location already exists",
      });
    }

    const result = await pool.query(
      `
      UPDATE locations
      SET
        building = COALESCE($1, building),
        floor = COALESCE($2, floor),
        room_code = COALESCE($3, room_code),
        description = COALESCE($4, description),
        updated_at = NOW()
      WHERE location_id = $5
      RETURNING
        location_id,
        building,
        floor,
        room_code,
        description,
        created_at,
        updated_at
      `,
      [
        building !== undefined ? building.trim() : null,
        floor !== undefined ? floor.trim() : null,
        room_code !== undefined ? room_code.trim() : null,
        description !== undefined ? description.trim() : null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update location error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update location",
    });
  }
};

module.exports = {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
};