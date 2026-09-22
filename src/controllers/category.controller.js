const pool = require("../config/database");

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        category_id,
        category_name,
        description,
        default_team_id,
        is_active,
        created_at,
        updated_at
      FROM categories
      ORDER BY category_name ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        category_id,
        category_name,
        description,
        default_team_id,
        is_active,
        created_at,
        updated_at
      FROM categories
      WHERE category_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get category by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve category",
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const {
      category_name,
      description,
      default_team_id,
    } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "category_name is required",
      });
    }

    const existingCategory = await pool.query(
      `
      SELECT category_id
      FROM categories
      WHERE LOWER(category_name) = LOWER($1)
      `,
      [category_name.trim()]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO categories (
        category_name,
        description,
        default_team_id
      )
      VALUES ($1, $2, $3)
      RETURNING
        category_id,
        category_name,
        description,
        default_team_id,
        is_active,
        created_at,
        updated_at
      `,
      [
        category_name.trim(),
        description?.trim() || null,
        default_team_id || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      category_name,
      description,
      default_team_id,
      is_active,
    } = req.body;

    const existingCategory = await pool.query(
      `
      SELECT category_id
      FROM categories
      WHERE category_id = $1
      `,
      [id]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (category_name !== undefined) {
      if (!category_name || !category_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "category_name cannot be empty",
        });
      }

      const duplicateCategory = await pool.query(
        `
        SELECT category_id
        FROM categories
        WHERE LOWER(category_name) = LOWER($1)
          AND category_id <> $2
        `,
        [category_name.trim(), id]
      );

      if (duplicateCategory.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Category already exists",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE categories
      SET
        category_name = COALESCE($1, category_name),
        description = COALESCE($2, description),
        default_team_id = COALESCE($3, default_team_id),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE category_id = $5
      RETURNING
        category_id,
        category_name,
        description,
        default_team_id,
        is_active,
        created_at,
        updated_at
      `,
      [
        category_name !== undefined ? category_name.trim() : null,
        description !== undefined ? description.trim() : null,
        default_team_id !== undefined ? default_team_id : null,
        is_active !== undefined ? is_active : null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
};