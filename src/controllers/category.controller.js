const pool = require("../config/database");

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.category_id,
        c.category_name,
        c.default_team_id,
        c.created_by,
        c.updated_by,
        c.created_at,
        c.updated_at
      FROM category c
      ORDER BY c.category_id ASC
    `);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "category_name is required",
      });
    }

    const existingCategory = await pool.query(
      `
      SELECT category_id
      FROM category
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
      INSERT INTO category (
        category_name,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $2)
      RETURNING
        category_id,
        category_name,
        default_team_id,
        created_by,
        updated_by,
        created_at,
        updated_at
      `,
      [category_name.trim(), req.user.user_id]
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.category_id,
        c.category_name,
        c.default_team_id,
        c.created_by,
        c.updated_by,
        c.created_at,
        c.updated_at
      FROM category c
      WHERE c.category_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get category by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve category",
    });
  }
};
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "category_name is required",
      });
    }

    const existingCategory = await pool.query(
      `
      SELECT category_id
      FROM category
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

    const duplicateCategory = await pool.query(
      `
      SELECT category_id
      FROM category
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

    const result = await pool.query(
      `
      UPDATE category
      SET
        category_name = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE category_id = $3
      RETURNING
        category_id,
        category_name,
        default_team_id,
        created_by,
        updated_by,
        created_at,
        updated_at
      `,
      [category_name.trim(), req.user.user_id, id]
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
};