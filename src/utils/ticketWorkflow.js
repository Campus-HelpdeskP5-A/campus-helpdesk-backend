const VALID_TICKET_STATUSES = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "REOPENED",
  "CLOSED",
];

const ALLOWED_TRANSITIONS = {
  NEW: ["TRIAGED"],
  TRIAGED: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING", "RESOLVED"],
  WAITING: ["IN_PROGRESS"],
  RESOLVED: ["REOPENED", "CLOSED"],
  REOPENED: ["IN_PROGRESS"],
  CLOSED: ["REOPENED"],
};

const ROLE_TRANSITIONS = {
  AGENT: VALID_TICKET_STATUSES.reduce(
    (transitions, status) => ({
      ...transitions,
      [status]: ALLOWED_TRANSITIONS[status],
    }),
    {}
  ),
  TECHNICIAN: {
    ASSIGNED: ["IN_PROGRESS"],
    IN_PROGRESS: ["WAITING", "RESOLVED"],
    WAITING: ["IN_PROGRESS"],
    REOPENED: ["IN_PROGRESS"],
  },
  MANAGER: VALID_TICKET_STATUSES.reduce(
    (transitions, status) => ({
      ...transitions,
      [status]: ALLOWED_TRANSITIONS[status],
    }),
    {}
  ),
};

const canTransition = (fromStatus, toStatus) =>
  VALID_TICKET_STATUSES.includes(fromStatus) &&
  ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);

const canRoleTransition = (role, fromStatus, toStatus) =>
  ROLE_TRANSITIONS[role]?.[fromStatus]?.includes(toStatus) || false;

const getAllowedNextStatuses = (status) =>
  ALLOWED_TRANSITIONS[status] || [];

module.exports = {
  VALID_TICKET_STATUSES,
  ALLOWED_TRANSITIONS,
  ROLE_TRANSITIONS,
  canTransition,
  canRoleTransition,
  getAllowedNextStatuses,
};
