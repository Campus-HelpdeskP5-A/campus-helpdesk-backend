const {
  getCanonicalPriority,
} = require("../src/utils/priorityMatrix");
const {
  canTransition,
  canRoleTransition,
  VALID_TICKET_STATUSES,
} = require("../src/utils/ticketWorkflow");
const {
  detectEmergency,
} = require("../src/utils/emergency");
const {
  addBusinessMinutes,
} = require("../src/services/sla.service");

describe("Campus Helpdesk workflow rules", () => {
  test("implements all nine priority combinations", () => {
    expect(getCanonicalPriority("LOW", "LOW")).toBe("LOW");
    expect(getCanonicalPriority("LOW", "MEDIUM")).toBe("LOW");
    expect(getCanonicalPriority("LOW", "HIGH")).toBe("MEDIUM");
    expect(getCanonicalPriority("MEDIUM", "LOW")).toBe("LOW");
    expect(getCanonicalPriority("MEDIUM", "MEDIUM")).toBe("MEDIUM");
    expect(getCanonicalPriority("MEDIUM", "HIGH")).toBe("HIGH");
    expect(getCanonicalPriority("HIGH", "LOW")).toBe("MEDIUM");
    expect(getCanonicalPriority("HIGH", "MEDIUM")).toBe("HIGH");
    expect(getCanonicalPriority("HIGH", "HIGH")).toBe("HIGH");
  });

  test("rejects invalid lifecycle transitions", () => {
    expect(VALID_TICKET_STATUSES).toEqual([
      "NEW",
      "TRIAGED",
      "ASSIGNED",
      "IN_PROGRESS",
      "WAITING",
      "RESOLVED",
      "REOPENED",
      "CLOSED",
    ]);
    expect(canTransition("NEW", "TRIAGED")).toBe(true);
    expect(canTransition("TRIAGED", "ASSIGNED")).toBe(true);
    expect(canTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "WAITING")).toBe(true);
    expect(canTransition("WAITING", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canTransition("RESOLVED", "REOPENED")).toBe(true);
    expect(canTransition("REOPENED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("RESOLVED", "CLOSED")).toBe(true);
    expect(canTransition("CLOSED", "REOPENED")).toBe(true);
    expect(canTransition("NEW", "CLOSED")).toBe(false);
    expect(canTransition("CLOSED", "NEW")).toBe(false);
    expect(canRoleTransition("TECHNICIAN", "NEW", "TRIAGED")).toBe(false);
    expect(canRoleTransition("AGENT", "NEW", "TRIAGED")).toBe(true);
    expect(canRoleTransition("MANAGER", "RESOLVED", "CLOSED")).toBe(true);
  });

  test("detects emergency keywords without changing priority", () => {
    const result = detectEmergency({
      title: "Gas leak in laboratory",
      description: "Please send official guidance.",
    });

    expect(result.detected).toBe(true);
    expect(result.matched_keywords).toContain("gas leak");
    expect(result.guidance).toMatch(/official campus emergency channel/i);
  });

  test("counts configured business minutes across a closed period", () => {
    const days = new Map(
      Array.from({ length: 7 }, (_, dayOfWeek) => [
        dayOfWeek,
        {
          is_working_day: dayOfWeek > 0 && dayOfWeek < 6,
          start_time: "09:00:00",
          end_time: "17:00:00",
        },
      ])
    );

    const due = addBusinessMinutes(
      new Date("2026-09-21T16:00:00.000Z"),
      120,
      "UTC",
      days
    );

    expect(due.toISOString()).toBe("2026-09-22T10:00:00.000Z");
  });
});