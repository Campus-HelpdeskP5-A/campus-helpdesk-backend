const pool = require("../config/database");

const VALID_IMPACTS = [
  "LOW",
  "MEDIUM",
  "HIGH",
];

const VALID_URGENCIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
];

const VALID_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

const {
  getCanonicalPriority,
} = require("../utils/priorityMatrix");

const {
  evaluateSlaExecutions,
} = require("../services/sla.service");

const validateDays = (days) => {
  if (!Array.isArray(days) || days.length !== 7) {
    return "days must contain exactly 7 day definitions";
  }

  const dayNumbers = days.map((day) =>
    Number(day.day_of_week)
  );

  if (
    new Set(dayNumbers).size !== 7 ||
    !dayNumbers.every(
      (day) =>
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6
    )
  ) {
    return (
      "days must contain unique day_of_week values from 0 to 6"
    );
  }

  for (const day of days) {
    const isWorkingDay =
      day.is_working_day !== false;

    if (isWorkingDay) {
      if (!day.start_time || !day.end_time) {
        return (
          "Working days must have both start_time and end_time"
        );
      }

      if (day.start_time >= day.end_time) {
        return (
          "start_time must be earlier than end_time"
        );
      }
    }
  }

  return null;
};

// POST /api/sla/evaluate
const evaluateSla = async (req, res) => {
  try {
    const statistics =
      await evaluateSlaExecutions();

    return res.status(200).json({
      success: true,
      message:
        "SLA evaluation completed successfully",
      data: statistics,
    });
  } catch (error) {
    console.error(
      "Evaluate SLA error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to evaluate SLA executions",
    });
  }
};

/*
|--------------------------------------------------------------------------
| BUSINESS HOURS
|--------------------------------------------------------------------------
*/

// GET /api/sla/business-hours
const getBusinessHours = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        bh.business_hours_id,
        bh.name,
        bh.timezone,
        bh.is_active,
        bh.created_at,
        bh.updated_at,

        COALESCE(
          json_agg(
            json_build_object(
              'day_of_week', bhd.day_of_week,
              'start_time', bhd.start_time,
              'end_time', bhd.end_time,
              'is_working_day', bhd.is_working_day
            )
            ORDER BY bhd.day_of_week
          ) FILTER (
            WHERE bhd.business_hours_id IS NOT NULL
          ),
          '[]'::json
        ) AS days

      FROM business_hours bh

      LEFT JOIN business_hours_days bhd
        ON bhd.business_hours_id =
           bh.business_hours_id

      GROUP BY
        bh.business_hours_id,
        bh.name,
        bh.timezone,
        bh.is_active,
        bh.created_at,
        bh.updated_at

      ORDER BY bh.name
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Get business hours error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch business hours",
    });
  }
};

// GET /api/sla/business-hours/:id
const getBusinessHoursById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        business_hours_id,
        name,
        timezone,
        is_active,
        created_at,
        updated_at
      FROM business_hours
      WHERE business_hours_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Business hours not found",
      });
    }

    const daysResult = await pool.query(
      `
      SELECT
        day_of_week,
        start_time,
        end_time,
        is_working_day
      FROM business_hours_days
      WHERE business_hours_id = $1
      ORDER BY day_of_week
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        days: daysResult.rows,
      },
    });
  } catch (error) {
    console.error(
      "Get business hours by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch business hours",
    });
  }
};

// POST /api/sla/business-hours
const createBusinessHours = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const {
      name,
      timezone,
      is_active = true,
      days,
    } = req.body;

    if (!name || !timezone) {
      return res.status(400).json({
        success: false,
        message:
          "name and timezone are required",
      });
    }

    const daysError = validateDays(days);

    if (daysError) {
      return res.status(400).json({
        success: false,
        message: daysError,
      });
    }

    const duplicate = await client.query(
      `
      SELECT business_hours_id
      FROM business_hours
      WHERE name = $1
      LIMIT 1
      `,
      [name]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Business hours with this name already exists",
      });
    }

    await client.query("BEGIN");

    const businessHoursResult =
      await client.query(
        `
        INSERT INTO business_hours (
          name,
          timezone,
          is_active
        )
        VALUES ($1, $2, $3)
        RETURNING
          business_hours_id,
          name,
          timezone,
          is_active,
          created_at,
          updated_at
        `,
        [
          name,
          timezone,
          is_active,
        ]
      );

    const businessHours =
      businessHoursResult.rows[0];

    for (const day of days) {
      await client.query(
        `
        INSERT INTO business_hours_days (
          business_hours_id,
          day_of_week,
          start_time,
          end_time,
          is_working_day
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          businessHours.business_hours_id,
          Number(day.day_of_week),
          day.is_working_day === false
            ? null
            : day.start_time,
          day.is_working_day === false
            ? null
            : day.end_time,
          day.is_working_day !== false,
        ]
      );
    }

    await client.query("COMMIT");

    const createdDays = await pool.query(
      `
      SELECT
        day_of_week,
        start_time,
        end_time,
        is_working_day
      FROM business_hours_days
      WHERE business_hours_id = $1
      ORDER BY day_of_week
      `,
      [businessHours.business_hours_id]
    );

    return res.status(201).json({
      success: true,
      message:
        "Business hours created successfully",
      data: {
        ...businessHours,
        days: createdDays.rows,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Create business hours error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create business hours",
    });
  } finally {
    client.release();
  }
};

// PUT /api/sla/business-hours/:id
const updateBusinessHours = async (
  req,
  res
) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      name,
      timezone,
      is_active,
      days,
    } = req.body;

    const existing = await client.query(
      `
      SELECT *
      FROM business_hours
      WHERE business_hours_id = $1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Business hours not found",
      });
    }

    if (days !== undefined) {
      const daysError =
        validateDays(days);

      if (daysError) {
        return res.status(400).json({
          success: false,
          message: daysError,
        });
      }
    }

    if (name !== undefined) {
      const duplicate =
        await client.query(
          `
          SELECT business_hours_id
          FROM business_hours
          WHERE name = $1
            AND business_hours_id <> $2
          LIMIT 1
          `,
          [name, id]
        );

      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "Business hours with this name already exists",
        });
      }
    }

    await client.query("BEGIN");

    const updatedResult =
      await client.query(
        `
        UPDATE business_hours
        SET
          name =
            COALESCE($1, name),

          timezone =
            COALESCE($2, timezone),

          is_active =
            COALESCE($3, is_active),

          updated_at = NOW()

        WHERE business_hours_id = $4

        RETURNING
          business_hours_id,
          name,
          timezone,
          is_active,
          created_at,
          updated_at
        `,
        [
          name ?? null,
          timezone ?? null,
          is_active ?? null,
          id,
        ]
      );

    if (days !== undefined) {
      await client.query(
        `
        DELETE FROM business_hours_days
        WHERE business_hours_id = $1
        `,
        [id]
      );

      for (const day of days) {
        await client.query(
          `
          INSERT INTO business_hours_days (
            business_hours_id,
            day_of_week,
            start_time,
            end_time,
            is_working_day
          )
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            id,
            Number(day.day_of_week),
            day.is_working_day === false
              ? null
              : day.start_time,
            day.is_working_day === false
              ? null
              : day.end_time,
            day.is_working_day !== false,
          ]
        );
      }
    }

    await client.query("COMMIT");

    const daysResult = await pool.query(
      `
      SELECT
        day_of_week,
        start_time,
        end_time,
        is_working_day
      FROM business_hours_days
      WHERE business_hours_id = $1
      ORDER BY day_of_week
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      message:
        "Business hours updated successfully",
      data: {
        ...updatedResult.rows[0],
        days: daysResult.rows,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Update business hours error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update business hours",
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| SLA PROFILES
|--------------------------------------------------------------------------
*/

// GET /api/sla/profiles
const getSlaProfiles = async (
  req,
  res
) => {
  try {
    const result = await pool.query(`
      SELECT
        sp.sla_profile_id,
        sp.name,
        sp.response_target_minutes,
        sp.resolution_target_minutes,
        sp.business_hours_id,
        bh.name AS business_hours_name,
        bh.timezone,
        bh.is_active AS business_hours_active,
        sp.is_active,
        sp.created_at,
        sp.updated_at
      FROM sla_profiles sp
      INNER JOIN business_hours bh
        ON bh.business_hours_id =
           sp.business_hours_id
      ORDER BY sp.name
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Get SLA profiles error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch SLA profiles",
    });
  }
};

// GET /api/sla/profiles/:id
const getSlaProfileById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        sp.sla_profile_id,
        sp.name,
        sp.response_target_minutes,
        sp.resolution_target_minutes,
        sp.business_hours_id,
        bh.name AS business_hours_name,
        bh.timezone,
        bh.is_active AS business_hours_active,
        sp.is_active,
        sp.created_at,
        sp.updated_at
      FROM sla_profiles sp
      INNER JOIN business_hours bh
        ON bh.business_hours_id =
           sp.business_hours_id
      WHERE sp.sla_profile_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "SLA profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get SLA profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch SLA profile",
    });
  }
};

// POST /api/sla/profiles
const createSlaProfile = async (
  req,
  res
) => {
  try {
    const {
      name,
      response_target_minutes,
      resolution_target_minutes,
      business_hours_id,
      is_active = true,
    } = req.body;

    if (
      !name ||
      response_target_minutes ===
        undefined ||
      resolution_target_minutes ===
        undefined ||
      !business_hours_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, response_target_minutes, resolution_target_minutes and business_hours_id are required",
      });
    }

    const responseTarget = Number(
      response_target_minutes
    );

    const resolutionTarget = Number(
      resolution_target_minutes
    );

    if (
      !Number.isInteger(
        responseTarget
      ) ||
      responseTarget <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "response_target_minutes must be a positive integer",
      });
    }

    if (
      !Number.isInteger(
        resolutionTarget
      ) ||
      resolutionTarget <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "resolution_target_minutes must be a positive integer",
      });
    }

    const businessHours =
      await pool.query(
        `
        SELECT
          business_hours_id
        FROM business_hours
        WHERE business_hours_id = $1
          AND is_active = TRUE
        LIMIT 1
        `,
        [business_hours_id]
      );

    if (businessHours.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Active business hours not found",
      });
    }

    const duplicate =
      await pool.query(
        `
        SELECT sla_profile_id
        FROM sla_profiles
        WHERE name = $1
        LIMIT 1
        `,
        [name]
      );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "SLA profile with this name already exists",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO sla_profiles (
        name,
        response_target_minutes,
        resolution_target_minutes,
        business_hours_id,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        sla_profile_id,
        name,
        response_target_minutes,
        resolution_target_minutes,
        business_hours_id,
        is_active,
        created_at,
        updated_at
      `,
      [
        name,
        responseTarget,
        resolutionTarget,
        business_hours_id,
        is_active,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "SLA profile created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Create SLA profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create SLA profile",
    });
  }
};

// PUT /api/sla/profiles/:id
const updateSlaProfile = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      name,
      response_target_minutes,
      resolution_target_minutes,
      business_hours_id,
      is_active,
    } = req.body;

    const existing = await pool.query(
      `
      SELECT *
      FROM sla_profiles
      WHERE sla_profile_id = $1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "SLA profile not found",
      });
    }

    const current = existing.rows[0];

    const finalResponse =
      response_target_minutes !==
      undefined
        ? Number(
            response_target_minutes
          )
        : current.response_target_minutes;

    const finalResolution =
      resolution_target_minutes !==
      undefined
        ? Number(
            resolution_target_minutes
          )
        : current.resolution_target_minutes;

    const finalBusinessHours =
      business_hours_id ??
      current.business_hours_id;

    const finalName =
      name !== undefined
        ? name
        : current.name;

    const finalActive =
      is_active !== undefined
        ? is_active
        : current.is_active;

    if (
      !Number.isInteger(
        finalResponse
      ) ||
      finalResponse <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "response_target_minutes must be a positive integer",
      });
    }

    if (
      !Number.isInteger(
        finalResolution
      ) ||
      finalResolution <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "resolution_target_minutes must be a positive integer",
      });
    }

    const businessHours =
      await pool.query(
        `
        SELECT
          business_hours_id,
          is_active
        FROM business_hours
        WHERE business_hours_id = $1
        LIMIT 1
        `,
        [finalBusinessHours]
      );

    if (businessHours.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Business hours not found",
      });
    }

    if (
      !businessHours.rows[0]
        .is_active &&
      finalActive
    ) {
      return res.status(400).json({
        success: false,
        message:
          "An active SLA profile must use active business hours",
      });
    }

    const duplicate =
      await pool.query(
        `
        SELECT sla_profile_id
        FROM sla_profiles
        WHERE name = $1
          AND sla_profile_id <> $2
        LIMIT 1
        `,
        [finalName, id]
      );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "SLA profile with this name already exists",
      });
    }

    const result = await pool.query(
      `
      UPDATE sla_profiles
      SET
        name = $1,
        response_target_minutes = $2,
        resolution_target_minutes = $3,
        business_hours_id = $4,
        is_active = $5,
        updated_at = NOW()
      WHERE sla_profile_id = $6
      RETURNING
        sla_profile_id,
        name,
        response_target_minutes,
        resolution_target_minutes,
        business_hours_id,
        is_active,
        created_at,
        updated_at
      `,
      [
        finalName,
        finalResponse,
        finalResolution,
        finalBusinessHours,
        finalActive,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "SLA profile updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update SLA profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update SLA profile",
    });
  }
};

/*
|--------------------------------------------------------------------------
| PRIORITY MATRIX
|--------------------------------------------------------------------------
*/

// GET /api/sla/priority-matrix
const getPriorityMatrix = async (
  req,
  res
) => {
  try {
    const result = await pool.query(`
      SELECT
        pm.priority_matrix_id,
        pm.impact,
        pm.urgency,
        pm.priority,
        pm.sla_profile_id,

        sp.name AS sla_profile_name,
        sp.response_target_minutes,
        sp.resolution_target_minutes,
        sp.business_hours_id,

        pm.is_active,
        pm.created_at

      FROM priority_matrices pm

      INNER JOIN sla_profiles sp
        ON sp.sla_profile_id =
           pm.sla_profile_id

      ORDER BY
        pm.impact,
        pm.urgency
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Get priority matrix error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch priority matrix",
    });
  }
};

// GET /api/sla/priority-matrix/resolve
const resolvePriority = async (
  req,
  res
) => {
  try {
    const {
      impact,
      urgency,
    } = req.query;

    const normalizedImpact =
      impact?.toUpperCase();

    const normalizedUrgency =
      urgency?.toUpperCase();

    if (
      !normalizedImpact ||
      !normalizedUrgency
    ) {
      return res.status(400).json({
        success: false,
        message:
          "impact and urgency are required",
      });
    }

    if (
      !VALID_IMPACTS.includes(
        normalizedImpact
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid impact",
      });
    }

    if (
      !VALID_URGENCIES.includes(
        normalizedUrgency
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid urgency",
      });
    }

    const result = await pool.query(
      `
      SELECT
        pm.priority_matrix_id,
        pm.impact,
        pm.urgency,
        pm.priority,
        pm.sla_profile_id,

        sp.name AS sla_profile_name,
        sp.response_target_minutes,
        sp.resolution_target_minutes,
        sp.business_hours_id

      FROM priority_matrices pm

      INNER JOIN sla_profiles sp
        ON sp.sla_profile_id =
           pm.sla_profile_id

      WHERE pm.impact = $1
        AND pm.urgency = $2
        AND pm.is_active = TRUE
        AND sp.is_active = TRUE

      LIMIT 1
      `,
      [
        normalizedImpact,
        normalizedUrgency,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No active priority matrix entry found for this impact and urgency",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Resolve priority error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to resolve priority",
    });
  }
};

// POST /api/sla/priority-matrix
const createPriorityMatrix = async (
  req,
  res
) => {
  try {
    const {
      impact,
      urgency,
      priority,
      sla_profile_id,
      is_active = true,
    } = req.body;

    const normalizedImpact =
      impact?.toUpperCase();

    const normalizedUrgency =
      urgency?.toUpperCase();

    const normalizedPriority =
      priority?.toUpperCase();

    if (
      !normalizedImpact ||
      !normalizedUrgency ||
      !normalizedPriority ||
      !sla_profile_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "impact, urgency, priority and sla_profile_id are required",
      });
    }

    if (
      !VALID_IMPACTS.includes(
        normalizedImpact
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid impact",
      });
    }

    if (
      !VALID_URGENCIES.includes(
        normalizedUrgency
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid urgency",
      });
    }

    if (
      !VALID_PRIORITIES.includes(
        normalizedPriority
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid priority",
      });
    }

    const expectedPriority =
      getCanonicalPriority(
        normalizedImpact,
        normalizedUrgency
      );

    if (
      expectedPriority !==
      normalizedPriority
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Priority does not match the configured impact and urgency matrix",
        expected_priority:
          expectedPriority,
      });
    }

    const sla = await pool.query(
      `
      SELECT
        sla_profile_id
      FROM sla_profiles
      WHERE sla_profile_id = $1
        AND is_active = TRUE
      LIMIT 1
      `,
      [sla_profile_id]
    );

    if (sla.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Active SLA profile not found",
      });
    }

    const duplicate =
      await pool.query(
        `
        SELECT
          priority_matrix_id
        FROM priority_matrices
        WHERE impact = $1
          AND urgency = $2
          AND is_active = $3
        LIMIT 1
        `,
        [
          normalizedImpact,
          normalizedUrgency,
          is_active,
        ]
      );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "A priority matrix entry already exists for this impact and urgency with the same active state",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO priority_matrices (
        impact,
        urgency,
        priority,
        sla_profile_id,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        priority_matrix_id,
        impact,
        urgency,
        priority,
        sla_profile_id,
        is_active,
        created_at
      `,
      [
        normalizedImpact,
        normalizedUrgency,
        normalizedPriority,
        sla_profile_id,
        is_active,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Priority matrix entry created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Create priority matrix error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create priority matrix entry",
    });
  }
};

// PUT /api/sla/priority-matrix/:id
const updatePriorityMatrix = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // Prevent req.body from causing an error
    // when no body is sent.
    const body = req.body || {};

    const {
      impact,
      urgency,
      priority,
      sla_profile_id,
      is_active,
    } = body;

    // ---------------------------------------------------------
    // 1. Find existing priority matrix entry
    // ---------------------------------------------------------

    const existing = await pool.query(
      `
      SELECT
        priority_matrix_id,
        impact,
        urgency,
        priority,
        sla_profile_id,
        is_active,
        created_at
      FROM priority_matrices
      WHERE priority_matrix_id = $1
      LIMIT 1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Priority matrix entry not found",
      });
    }

    const current = existing.rows[0];

    // ---------------------------------------------------------
    // 2. Keep current values when fields are not provided
    // ---------------------------------------------------------

    const finalImpact =
      impact !== undefined &&
      impact !== null
        ? String(impact).toUpperCase()
        : current.impact;

    const finalUrgency =
      urgency !== undefined &&
      urgency !== null
        ? String(urgency).toUpperCase()
        : current.urgency;

    const finalPriority =
      priority !== undefined &&
      priority !== null
        ? String(priority).toUpperCase()
        : current.priority;

    const finalSla =
      sla_profile_id !== undefined &&
      sla_profile_id !== null &&
      sla_profile_id !== ""
        ? sla_profile_id
        : current.sla_profile_id;

    const finalActive =
      is_active !== undefined &&
      is_active !== null
        ? is_active
        : current.is_active;

    // ---------------------------------------------------------
    // 3. Validate impact
    // ---------------------------------------------------------

    if (
      !VALID_IMPACTS.includes(
        finalImpact
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid impact",
        allowed_values:
          VALID_IMPACTS,
      });
    }

    // ---------------------------------------------------------
    // 4. Validate urgency
    // ---------------------------------------------------------

    if (
      !VALID_URGENCIES.includes(
        finalUrgency
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid urgency",
        allowed_values:
          VALID_URGENCIES,
      });
    }

    // ---------------------------------------------------------
    // 5. Validate priority
    // ---------------------------------------------------------

    if (
      !VALID_PRIORITIES.includes(
        finalPriority
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid priority",
        allowed_values:
          VALID_PRIORITIES,
      });
    }

    // ---------------------------------------------------------
    // 6. Validate canonical priority
    // ---------------------------------------------------------

    const expectedPriority =
      getCanonicalPriority(
        finalImpact,
        finalUrgency
      );

    if (
      expectedPriority !==
      finalPriority
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Priority does not match the configured impact and urgency matrix",
        expected_priority:
          expectedPriority,
      });
    }

    // ---------------------------------------------------------
    // 7. Check SLA profile
    // ---------------------------------------------------------

    const sla = await pool.query(
      `
      SELECT
        sla_profile_id,
        is_active
      FROM sla_profiles
      WHERE sla_profile_id = $1
      LIMIT 1
      `,
      [finalSla]
    );

    if (sla.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "SLA profile not found",
      });
    }

    // ---------------------------------------------------------
    // 8. Active matrix requires active SLA profile
    // ---------------------------------------------------------

    if (
      finalActive &&
      !sla.rows[0].is_active
    ) {
      return res.status(400).json({
        success: false,
        message:
          "An active priority matrix entry must use an active SLA profile",
      });
    }

    // ---------------------------------------------------------
    // 9. Prevent duplicate matrix entries
    // ---------------------------------------------------------

    const duplicate =
      await pool.query(
        `
        SELECT
          priority_matrix_id
        FROM priority_matrices
        WHERE impact = $1
          AND urgency = $2
          AND is_active = $3
          AND priority_matrix_id <> $4
        LIMIT 1
        `,
        [
          finalImpact,
          finalUrgency,
          finalActive,
          id,
        ]
      );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Another priority matrix entry already exists for this impact and urgency with the same active state",
      });
    }

    // ---------------------------------------------------------
    // 10. Update database
    // ---------------------------------------------------------

    const result = await pool.query(
      `
      UPDATE priority_matrices
      SET
        impact = $1,
        urgency = $2,
        priority = $3,
        sla_profile_id = $4,
        is_active = $5
      WHERE priority_matrix_id = $6
      RETURNING
        priority_matrix_id,
        impact,
        urgency,
        priority,
        sla_profile_id,
        is_active,
        created_at
      `,
      [
        finalImpact,
        finalUrgency,
        finalPriority,
        finalSla,
        finalActive,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "Priority matrix entry updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update priority matrix error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update priority matrix entry",
    });
  }
};

module.exports = {
  getBusinessHours,
  getBusinessHoursById,
  createBusinessHours,
  updateBusinessHours,

  getSlaProfiles,
  getSlaProfileById,
  createSlaProfile,
  updateSlaProfile,

  getPriorityMatrix,
  resolvePriority,
  createPriorityMatrix,
  updatePriorityMatrix,

  evaluateSla,
};