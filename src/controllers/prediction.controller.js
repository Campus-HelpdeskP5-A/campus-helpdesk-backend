const pool = require("../config/database");
const { canAccessTicket } = require("../utils/accessControl");

const VALID_DECISIONS = [
  "PENDING",
  "ACCEPTED",
  "OVERRIDDEN",
];

const REVIEW_ROLES = [
  "AGENT",
  "TECHNICIAN",
  "MANAGER",
];

const getTicketForAccess = async (
  ticketId,
  user
) => {
  const result = await pool.query(
    `
    SELECT
      ticket_id,
      reporter_id
    FROM tickets
    WHERE ticket_id = $1
    `,
    [ticketId]
  );

  if (result.rows.length === 0) {
    return {
      exists: false,
      allowed: false,
    };
  }

  const allowed = await canAccessTicket(
    user,
    ticketId
  );

  return {
    exists: true,
    allowed,
  };
};

/*
|--------------------------------------------------------------------------
| GET TICKET PREDICTIONS
|--------------------------------------------------------------------------
*/

// GET /api/predictions/ticket/:ticketId
const getTicketPredictions = async (
  req,
  res
) => {
  try {
    const { ticketId } = req.params;

    const access = await getTicketForAccess(
      ticketId,
      req.user
    );

    if (!access.exists) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access predictions for this ticket",
      });
    }

    const result = await pool.query(
      `
      SELECT
        p.prediction_id,
        p.ticket_id,

        p.model_version_id,
        mv.model_name,
        mv.version AS model_version,
        mv.model_type,

        p.prediction_type,
        p.predicted_value,
        p.confidence,
        p.explanation,
        p.created_at AS prediction_timestamp,

        p.decision,
        p.override_value,

        p.reviewed_by,
        reviewer.full_name AS reviewer_name,
        reviewer.role AS reviewer_role,

        p.reviewed_at,
        p.created_at

      FROM predictions p

      INNER JOIN ai_model_versions mv
        ON mv.model_version_id =
           p.model_version_id

      LEFT JOIN users reviewer
        ON reviewer.user_id =
           p.reviewed_by

      WHERE p.ticket_id = $1

      ORDER BY
        p.created_at DESC
      `,
      [ticketId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "Get ticket predictions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve ticket predictions",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET PREDICTION BY ID
|--------------------------------------------------------------------------
*/

// GET /api/predictions/:id
const getPredictionById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        p.prediction_id,
        p.ticket_id,

        p.model_version_id,
        mv.model_name,
        mv.version AS model_version,
        mv.model_type,

        p.prediction_type,
        p.predicted_value,
        p.confidence,
        p.explanation,
        p.created_at AS prediction_timestamp,

        p.decision,
        p.override_value,

        p.reviewed_by,
        reviewer.full_name AS reviewer_name,
        reviewer.role AS reviewer_role,

        p.reviewed_at,
        p.created_at,

        t.reference_number,
        t.title,
        t.reporter_id

      FROM predictions p

      INNER JOIN ai_model_versions mv
        ON mv.model_version_id =
           p.model_version_id

      INNER JOIN tickets t
        ON t.ticket_id = p.ticket_id

      LEFT JOIN users reviewer
        ON reviewer.user_id =
           p.reviewed_by

      WHERE p.prediction_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Prediction not found",
      });
    }

    const prediction = result.rows[0];

    const hasAccess =
      await canAccessTicket(
        req.user,
        prediction.ticket_id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this prediction",
      });
    }

    return res.status(200).json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error(
      "Get prediction error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve prediction",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE PREDICTION
|--------------------------------------------------------------------------
*/

// POST /api/predictions
const createPrediction = async (
  req,
  res
) => {
  try {
    const {
      ticket_id,
      model_version_id,
      prediction_type,
      predicted_value,
      confidence,
      explanation,
    } = req.body;

    const { role } = req.user;

    // Only staff can create predictions
    if (
      !REVIEW_ROLES.includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create predictions",
      });
    }

    if (
      !ticket_id ||
      !model_version_id ||
      !prediction_type ||
      !predicted_value
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ticket_id, model_version_id, prediction_type and predicted_value are required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Confidence validation
    |--------------------------------------------------------------------------
    */

    let normalizedConfidence = null;

    if (
      confidence !== undefined &&
      confidence !== null
    ) {
      normalizedConfidence =
        Number(confidence);

      if (
        Number.isNaN(normalizedConfidence) ||
        normalizedConfidence < 0 ||
        normalizedConfidence > 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "confidence must be between 0 and 1",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Ticket access
    |--------------------------------------------------------------------------
    */

    const access =
      await getTicketForAccess(
        ticket_id,
        req.user
      );

    if (!access.exists) {
      return res.status(404).json({
        success: false,
        message:
          "Ticket not found",
      });
    }

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create a prediction for this ticket",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate AI model
    |--------------------------------------------------------------------------
    */

    const modelResult = await pool.query(
      `
      SELECT
        model_version_id,
        model_name,
        version,
        model_type,
        is_active
      FROM ai_model_versions
      WHERE model_version_id = $1
      `,
      [model_version_id]
    );

    if (modelResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "AI model version not found",
      });
    }

    const model =
      modelResult.rows[0];

    if (!model.is_active) {
      return res.status(400).json({
        success: false,
        message:
          "AI model version is not active",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create prediction
    |--------------------------------------------------------------------------
    */

    const result = await pool.query(
      `
      INSERT INTO predictions (
        ticket_id,
        model_version_id,
        prediction_type,
        predicted_value,
        confidence,
        explanation,
        decision
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'PENDING'
      )
      RETURNING
        prediction_id,
        ticket_id,
        model_version_id,
        prediction_type,
        predicted_value,
        confidence,
        explanation,
        created_at AS prediction_timestamp,
        decision,
        override_value,
        reviewed_by,
        reviewed_at,
        created_at
      `,
      [
        ticket_id,
        model_version_id,
        prediction_type,
        predicted_value,
        normalizedConfidence,
        explanation || null,
      ]
    );

    await pool.query(
      `
      INSERT INTO ticket_events (
        ticket_id, event_type, actor_user_id, event_data
      )
      VALUES ($1, 'AI_SUGGESTION_CREATED', $2, $3::jsonb)
      `,
      [
        ticket_id,
        req.user.user_id,
        JSON.stringify({
          prediction_id: result.rows[0].prediction_id,
          prediction_type,
          confidence: normalizedConfidence,
        }),
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Prediction created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Create prediction error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create prediction",
    });
  }
};

/*
|--------------------------------------------------------------------------
| REVIEW PREDICTION
|--------------------------------------------------------------------------
*/

// PATCH /api/predictions/:id/review
const reviewPrediction = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      decision,
      override_value,
    } = req.body;

    const { user_id, role } =
      req.user;

    /*
    |--------------------------------------------------------------------------
    | Role authorization
    |--------------------------------------------------------------------------
    */

    if (
      !REVIEW_ROLES.includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to review predictions",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate decision
    |--------------------------------------------------------------------------
    */

    if (!decision) {
      return res.status(400).json({
        success: false,
        message:
          "decision is required",
      });
    }

    const normalizedDecision =
      decision.toUpperCase();

    if (
      !VALID_DECISIONS.includes(
        normalizedDecision
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "decision must be one of: PENDING, ACCEPTED, OVERRIDDEN",
      });
    }

    if (
      normalizedDecision === "PENDING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A review can only result in ACCEPTED or OVERRIDDEN",
      });
    }

    if (
      normalizedDecision ===
        "OVERRIDDEN" &&
      !override_value
    ) {
      return res.status(400).json({
        success: false,
        message:
          "override_value is required when decision is OVERRIDDEN",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get prediction
    |--------------------------------------------------------------------------
    */

    const existingResult =
      await pool.query(
        `
        SELECT
          p.prediction_id,
          p.ticket_id,
          p.decision
        FROM predictions p
        WHERE p.prediction_id = $1
        `,
        [id]
      );

    if (
      existingResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Prediction not found",
      });
    }

    const existing =
      existingResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Ticket access
    |--------------------------------------------------------------------------
    */

    const hasTicketAccess =
      await canAccessTicket(
        req.user,
        existing.ticket_id
      );

    if (!hasTicketAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to review this prediction",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate review
    |--------------------------------------------------------------------------
    */

    if (
      existing.decision !==
      "PENDING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Prediction has already been reviewed",
      });
    }

    /*
    |--------------------------------------------------------------------------

    | Update prediction
    |--------------------------------------------------------------------------
    */

    const result = await pool.query(
      `
      UPDATE predictions
      SET
        decision = $1,

        override_value = $2,

        reviewed_by = $3,

        reviewed_at = NOW()

      WHERE prediction_id = $4

      RETURNING
        prediction_id,
        ticket_id,
        model_version_id,
        prediction_type,
        predicted_value,
        confidence,
        explanation,
        created_at AS prediction_timestamp,
        decision,
        override_value,
        reviewed_by,
        reviewed_at,
        created_at
      `,
      [
        normalizedDecision,

        normalizedDecision ===
        "OVERRIDDEN"
          ? override_value
          : null,

        user_id,

        id,
      ]
    );

    await pool.query(
      `
      INSERT INTO ticket_events (
        ticket_id, event_type, actor_user_id, event_data
      )
      VALUES ($1, $2, $3, $4::jsonb)
      `,
      [
        existing.ticket_id,
        normalizedDecision === "ACCEPTED"
          ? "AI_SUGGESTION_ACCEPTED"
          : "AI_SUGGESTION_OVERRIDDEN",
        user_id,
        JSON.stringify({
          prediction_id: id,
          decision: normalizedDecision,
          override_value:
            normalizedDecision === "OVERRIDDEN"
              ? override_value
              : null,
        }),
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        `Prediction ${normalizedDecision.toLowerCase()} successfully`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Review prediction error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to review prediction",
    });
  }
};

module.exports = {
  getTicketPredictions,
  getPredictionById,
  createPrediction,
  reviewPrediction,
};