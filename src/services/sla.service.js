const pool = require("../config/database");
const {
  writeAuditLog,
} = require("./audit.service");
const {
  notifySlaStatus,
} = require("./notification.service");

const DEFAULT_SLA_RISK_WINDOW_MINUTES = 60;

const getSlaRiskWindowMinutes = () => {
  const configured = Number(
    process.env.SLA_RISK_WINDOW_MINUTES
  );

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_SLA_RISK_WINDOW_MINUTES;
};

const evaluateExecutionState = ({
  execution,
  ticket,
  now = new Date(),
  riskWindowMinutes = getSlaRiskWindowMinutes(),
}) => {
  const nowTime = new Date(now).getTime();
  const riskWindowMilliseconds =
    riskWindowMinutes * 60 * 1000;
  const responseCompleted = Boolean(
    ticket.first_response_at
  );
  const resolutionCompleted = [
    "RESOLVED",
    "CLOSED",
  ].includes(ticket.status);

  const evaluateDeadline = (dueAt, completed) => {
    if (!dueAt || completed) {
      return "ON_TRACK";
    }

    const dueTime = new Date(dueAt).getTime();

    if (dueTime <= nowTime) {
      return "BREACHED";
    }

    if (dueTime - nowTime <= riskWindowMilliseconds) {
      return "AT_RISK";
    }

    return "ON_TRACK";
  };

  const responseState = evaluateDeadline(
    execution.response_due_at,
    responseCompleted
  );
  const resolutionState = evaluateDeadline(
    execution.resolution_due_at,
    resolutionCompleted
  );
  const hasBreach = [
    responseState,
    resolutionState,
  ].includes("BREACHED");
  const hasRisk = [
    responseState,
    resolutionState,
  ].includes("AT_RISK");
  const calculatedStatus = hasBreach
    ? "BREACHED"
    : hasRisk
      ? "AT_RISK"
      : "ON_TRACK";
  const nextStatus =
    execution.sla_status === "BREACHED"
      ? "BREACHED"
      : calculatedStatus;

  return {
    responseState,
    resolutionState,
    nextStatus,
    responseCompleted,
    resolutionCompleted,
    responseBreached:
      responseState === "BREACHED" &&
      !execution.response_breached_at,
    resolutionBreached:
      resolutionState === "BREACHED" &&
      !execution.resolution_breached_at,
    enteredRisk:
      nextStatus === "AT_RISK" &&
      execution.sla_status !== "AT_RISK" &&
      execution.sla_status !== "BREACHED",
    enteredBreach:
      nextStatus === "BREACHED" &&
      execution.sla_status !== "BREACHED",
  };
};

const getSlaRecipients = async (client, ticketId) => {
  const result = await client.query(
    `
    SELECT DISTINCT recipient_user_id
    FROM (
      SELECT t.reporter_id AS recipient_user_id
      FROM tickets t
      WHERE t.ticket_id = $1

      UNION

      SELECT a.assigned_to
      FROM assignments a
      INNER JOIN users u
        ON u.user_id = a.assigned_to
       AND u.account_status = 'ACTIVE'
      WHERE a.ticket_id = $1
        AND a.is_current = TRUE
        AND a.assigned_to IS NOT NULL

      UNION

      SELECT ut.user_id
      FROM assignments a
      INNER JOIN user_teams ut
        ON ut.support_team_id = a.assigned_team_id
       AND ut.left_at IS NULL
      INNER JOIN users u
        ON u.user_id = ut.user_id
       AND u.account_status = 'ACTIVE'
      WHERE a.ticket_id = $1
        AND a.is_current = TRUE
        AND a.assigned_team_id IS NOT NULL
    ) recipients
    WHERE recipient_user_id IS NOT NULL
    `,
    [ticketId]
  );

  return result.rows.map(
    (row) => row.recipient_user_id
  );
};

const evaluateSlaExecutions = async ({
  now = new Date(),
} = {}) => {
  const client = await pool.connect();
  const statistics = {
    evaluated: 0,
    updated: 0,
    risk_events: 0,
    breach_events: 0,
    notifications: 0,
  };

  try {
    const executions = await client.query(`
      SELECT
        tse.*,
        t.reference_number,
        t.reporter_id,
        t.status AS ticket_status,
        t.first_response_at,
        COALESCE(
          (
            SELECT a.assigned_to
            FROM assignments a
            WHERE a.ticket_id = t.ticket_id
              AND a.is_current = TRUE
              AND a.assigned_to IS NOT NULL
            LIMIT 1
          ),
          tse.created_by,
          t.reporter_id
        ) AS event_actor_user_id
      FROM ticket_sla_executions tse
      INNER JOIN tickets t
        ON t.ticket_id = tse.ticket_id
      WHERE tse.is_current = TRUE
      ORDER BY tse.ticket_sla_execution_id
      FOR UPDATE OF tse
    `);

    for (const row of executions.rows) {
      statistics.evaluated += 1;
      const evaluation = evaluateExecutionState({
        execution: row,
        ticket: {
          status: row.ticket_status,
          first_response_at: row.first_response_at,
        },
        now,
      });
      const responseBreachAt = evaluation.responseBreached
        ? now
        : row.response_breached_at;
      const resolutionBreachAt = evaluation.resolutionBreached
        ? now
        : row.resolution_breached_at;
      const stateChanged =
        evaluation.nextStatus !== row.sla_status ||
        Boolean(evaluation.responseBreached) ||
        Boolean(evaluation.resolutionBreached);

      if (!stateChanged) {
        continue;
      }

      await client.query("BEGIN");

      const updated = await client.query(
        `
        UPDATE ticket_sla_executions
        SET
          sla_status = $1,
          response_breached_at = $2,
          resolution_breached_at = $3
        WHERE ticket_sla_execution_id = $4
          AND is_current = TRUE
          AND sla_status = $5
          AND response_breached_at IS NOT DISTINCT FROM $6
          AND resolution_breached_at IS NOT DISTINCT FROM $7
        RETURNING ticket_sla_execution_id
        `,
        [
          evaluation.nextStatus,
          responseBreachAt,
          resolutionBreachAt,
          row.ticket_sla_execution_id,
          row.sla_status,
          row.response_breached_at,
          row.resolution_breached_at,
        ]
      );

      if (updated.rows.length === 0) {
        await client.query("ROLLBACK");
        continue;
      }

      const eventType = evaluation.enteredBreach
        ? "SLA_BREACHED"
        : evaluation.enteredRisk
          ? "SLA_RISK_DETECTED"
          : null;

      if (eventType) {
        await client.query(
          `
          INSERT INTO ticket_events (
            ticket_id,
            event_type,
            actor_user_id,
            event_data
          )
          VALUES ($1, $2, $3, $4::jsonb)
          `,
          [
            row.ticket_id,
            eventType,
            row.event_actor_user_id,
            JSON.stringify({
              ticket_sla_execution_id:
                row.ticket_sla_execution_id,
              previous_status: row.sla_status,
              new_status: evaluation.nextStatus,
              response_state: evaluation.responseState,
              resolution_state: evaluation.resolutionState,
              evaluated_at: now,
              automated: true,
            }),
          ]
        );

        await writeAuditLog({
          client,
          actorUserId: null,
          action: eventType,
          entityType: "TICKET_SLA_EXECUTION",
          entityId: row.ticket_sla_execution_id,
          oldValues: {
            sla_status: row.sla_status,
          },
          newValues: {
            sla_status: evaluation.nextStatus,
            response_state: evaluation.responseState,
            resolution_state: evaluation.resolutionState,
          },
        });
      }

      const recipients = eventType
        ? await getSlaRecipients(client, row.ticket_id)
        : [];

      for (const recipientUserId of recipients) {
        await notifySlaStatus({
          client,
          recipientUserId,
          ticketId: row.ticket_id,
          referenceNumber: row.reference_number,
          status: eventType === "SLA_BREACHED"
            ? "BREACHED"
            : "AT_RISK",
        });
        statistics.notifications += 1;
      }

      await client.query("COMMIT");
      statistics.updated += 1;
      if (eventType === "SLA_RISK_DETECTED") {
        statistics.risk_events += 1;
      }
      if (eventType === "SLA_BREACHED") {
        statistics.breach_events += 1;
      }
    }

    return statistics;
  } finally {
    client.release();
  }
};

const startSlaMonitor = () => {
  const configuredInterval = Number(
    process.env.SLA_MONITOR_INTERVAL_MS || 60000
  );
  const intervalMilliseconds =
    Number.isFinite(configuredInterval) &&
    configuredInterval > 0
      ? configuredInterval
      : 60000;
  let isRunning = false;

  const run = () => {
    if (isRunning) return;
    isRunning = true;

    evaluateSlaExecutions()
      .catch((error) => {
        console.error("SLA monitor error:", error);
      })
      .finally(() => {
        isRunning = false;
      });
  };

  run();
  return setInterval(run, intervalMilliseconds);
};

const WEEKDAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const getLocalTimeParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return {
    dayOfWeek: WEEKDAY_INDEX[values.weekday],
    minutes:
      Number(values.hour) * 60 + Number(values.minute),
  };
};

const timeToMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value)
    .slice(0, 5)
    .split(":")
    .map(Number);
  return hours * 60 + minutes;
};

const addBusinessMinutes = (
  startDate,
  targetMinutes,
  timeZone,
  daysByNumber
) => {
  let cursor = new Date(startDate);
  let remaining = Number(targetMinutes);
  let inspectedMinutes = 0;
  const maximumInspectedMinutes = 366 * 24 * 60;

  while (remaining > 0 && inspectedMinutes < maximumInspectedMinutes) {
    const local = getLocalTimeParts(cursor, timeZone);
    const day = daysByNumber.get(local.dayOfWeek);
    const start = timeToMinutes(day?.start_time);
    const end = timeToMinutes(day?.end_time);
    const isBusinessMinute =
      day?.is_working_day &&
      start !== null &&
      end !== null &&
      local.minutes >= start &&
      local.minutes < end;

    if (isBusinessMinute) remaining -= 1;

    cursor = new Date(cursor.getTime() + 60 * 1000);
    inspectedMinutes += 1;
  }

  if (remaining > 0) {
    throw new Error(
      "Business-hours configuration cannot satisfy the SLA target"
    );
  }

  return cursor;
};

const calculateSlaDueDates = async ({
  client,
  businessHoursId,
  startDate,
  responseTargetMinutes,
  resolutionTargetMinutes,
}) => {
  const result = await client.query(
    `
    SELECT
      bh.timezone,
      bh.is_active,
      bhd.day_of_week,
      bhd.is_working_day,
      bhd.start_time,
      bhd.end_time
    FROM business_hours bh
    INNER JOIN business_hours_days bhd
      ON bhd.business_hours_id = bh.business_hours_id
    WHERE bh.business_hours_id = $1
    ORDER BY bhd.day_of_week
    `,
    [businessHoursId]
  );

  if (result.rows.length === 0 || !result.rows[0].is_active) {
    throw new Error("Active business-hours configuration not found");
  }

  const daysByNumber = new Map(
    result.rows.map((row) => [Number(row.day_of_week), row])
  );
  const timeZone = result.rows[0].timezone || "UTC";

  return {
    responseDueAt: addBusinessMinutes(
      startDate,
      responseTargetMinutes,
      timeZone,
      daysByNumber
    ),
    resolutionDueAt: addBusinessMinutes(
      startDate,
      resolutionTargetMinutes,
      timeZone,
      daysByNumber
    ),
  };
};

module.exports = {
  addBusinessMinutes,
  calculateSlaDueDates,
  evaluateExecutionState,
  evaluateSlaExecutions,
  getSlaRiskWindowMinutes,
  startSlaMonitor,
};
