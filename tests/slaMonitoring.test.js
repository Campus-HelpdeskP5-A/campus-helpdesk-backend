const {
  evaluateExecutionState,
} = require("../src/services/sla.service");

const baseExecution = {
  sla_status: "ON_TRACK",
  response_due_at: "2026-09-25T12:00:00.000Z",
  resolution_due_at: "2026-09-25T18:00:00.000Z",
  response_breached_at: null,
  resolution_breached_at: null,
};

const evaluationTime = new Date("2026-09-25T11:00:00.000Z");

const evaluate = (execution, ticket = {}) =>
  evaluateExecutionState({
    execution: {
      ...baseExecution,
      ...execution,
    },
    ticket: {
      status: "IN_PROGRESS",
      first_response_at: null,
      ...ticket,
    },
    now: evaluationTime,
    riskWindowMinutes: 60,
  });

describe("SLA monitoring state evaluation", () => {
  test("keeps a safe execution ON_TRACK", () => {
    const result = evaluate({
      response_due_at: "2026-09-25T14:00:00.000Z",
    });

    expect(result.nextStatus).toBe("ON_TRACK");
    expect(result.enteredRisk).toBe(false);
    expect(result.enteredBreach).toBe(false);
  });

  test("moves an execution into AT_RISK", () => {
    const result = evaluate({
      response_due_at: "2026-09-25T11:30:00.000Z",
    });

    expect(result.nextStatus).toBe("AT_RISK");
    expect(result.enteredRisk).toBe(true);
  });

  test("moves AT_RISK to BREACHED", () => {
    const result = evaluate(
      {
        sla_status: "AT_RISK",
        response_due_at: "2026-09-25T10:00:00.000Z",
      }
    );

    expect(result.nextStatus).toBe("BREACHED");
    expect(result.enteredBreach).toBe(true);
  });

  test("does not repeat risk or breach events", () => {
    const risk = evaluate({
      sla_status: "AT_RISK",
      response_due_at: "2026-09-25T11:30:00.000Z",
    });
    const breach = evaluate({
      sla_status: "BREACHED",
      response_due_at: "2026-09-25T10:00:00.000Z",
      response_breached_at: "2026-09-25T10:01:00.000Z",
    });

    expect(risk.enteredRisk).toBe(false);
    expect(risk.enteredBreach).toBe(false);
    expect(breach.enteredRisk).toBe(false);
    expect(breach.enteredBreach).toBe(false);
    expect(breach.nextStatus).toBe("BREACHED");
  });

  test("evaluates response and resolution independently", () => {
    const responseRisk = evaluate({
      response_due_at: "2026-09-25T11:30:00.000Z",
      resolution_due_at: "2026-09-25T18:00:00.000Z",
    });
    const resolutionRisk = evaluate({
      response_due_at: "2026-09-25T14:00:00.000Z",
      resolution_due_at: "2026-09-25T11:30:00.000Z",
    });
    const responseBreach = evaluate({
      response_due_at: "2026-09-25T10:00:00.000Z",
    });
    const resolutionBreach = evaluate({
      response_due_at: "2026-09-25T14:00:00.000Z",
      resolution_due_at: "2026-09-25T10:00:00.000Z",
    });

    expect(responseRisk.responseState).toBe("AT_RISK");
    expect(responseRisk.resolutionState).toBe("ON_TRACK");
    expect(resolutionRisk.responseState).toBe("ON_TRACK");
    expect(resolutionRisk.resolutionState).toBe("AT_RISK");
    expect(responseBreach.responseState).toBe("BREACHED");
    expect(resolutionBreach.resolutionState).toBe("BREACHED");
  });

  test("does not breach a completed response", () => {
    const result = evaluate(
      { response_due_at: "2026-09-25T10:00:00.000Z" },
      { first_response_at: "2026-09-25T09:30:00.000Z" }
    );

    expect(result.responseCompleted).toBe(true);
    expect(result.responseState).toBe("ON_TRACK");
    expect(result.nextStatus).toBe("ON_TRACK");
  });

  test("does not breach a resolved or closed ticket", () => {
    const resolved = evaluate(
      { resolution_due_at: "2026-09-25T10:00:00.000Z" },
      { status: "RESOLVED" }
    );
    const closed = evaluate(
      { resolution_due_at: "2026-09-25T10:00:00.000Z" },
      { status: "CLOSED" }
    );

    expect(resolved.resolutionState).toBe("ON_TRACK");
    expect(closed.resolutionState).toBe("ON_TRACK");
  });

  test("treats a reopened ticket as unresolved again", () => {
    const result = evaluate(
      { resolution_due_at: "2026-09-25T10:00:00.000Z" },
      { status: "REOPENED" }
    );

    expect(result.resolutionState).toBe("BREACHED");
    expect(result.nextStatus).toBe("BREACHED");
  });
});
