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
};
