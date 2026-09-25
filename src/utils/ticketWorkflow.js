
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

/**
 * General ticket state machine.
 *
 * These are the valid state transitions in the system.
 *
 * Reporter-specific transitions such as:
 * RESOLVED -> CLOSED
 * RESOLVED/CLOSED -> REOPENED
 *
 * are handled by dedicated endpoints:
 * - POST /api/tickets/:id/confirm-resolution
 * - POST /api/tickets/:id/reopen
 */
const ALLOWED_TRANSITIONS = {
  NEW: ["TRIAGED"],

  TRIAGED: ["ASSIGNED"],

  ASSIGNED: ["IN_PROGRESS"],

  IN_PROGRESS: [
    "WAITING",
    "RESOLVED",
  ],

  WAITING: [
    "IN_PROGRESS",
  ],

  RESOLVED: [
    "REOPENED",
    "CLOSED",
  ],

  REOPENED: [
    "IN_PROGRESS",
  ],

  CLOSED: [
    "REOPENED",
  ],
};

/**
 * Role-based transitions for PATCH /tickets/:id/status.
 *
 * REPORTER:
 * - Does not use the generic status endpoint.
 * - Confirmation and reopening are handled by dedicated endpoints.
 *
 * AGENT:
 * - NEW -> TRIAGED
 * - TRIAGED -> ASSIGNED
 *
 * TECHNICIAN:
 * - ASSIGNED -> IN_PROGRESS
 * - IN_PROGRESS -> WAITING
 * - IN_PROGRESS -> RESOLVED
 * - WAITING -> IN_PROGRESS
 * - REOPENED -> IN_PROGRESS
 *
 * MANAGER:
 * - Can perform operational workflow transitions.
 * - Cannot directly CLOSE or REOPEN through the generic status endpoint.
 */
const ROLE_TRANSITIONS = {
  AGENT: {
    NEW: ["TRIAGED"],

    TRIAGED: ["ASSIGNED"],
  },

  TECHNICIAN: {
    ASSIGNED: ["IN_PROGRESS"],

    IN_PROGRESS: [
      "WAITING",
      "RESOLVED",
    ],

    WAITING: [
      "IN_PROGRESS",
    ],

    REOPENED: [
      "IN_PROGRESS",
    ],
  },

  MANAGER: {
    NEW: ["TRIAGED"],

    TRIAGED: ["ASSIGNED"],

    ASSIGNED: ["IN_PROGRESS"],

    IN_PROGRESS: [
      "WAITING",
      "RESOLVED",
    ],

    WAITING: [
      "IN_PROGRESS",
    ],
  },
};

/**
 * Check whether a state transition is generally valid.
 */
const canTransition = (
  fromStatus,
  toStatus
) => {
  return (
    VALID_TICKET_STATUSES.includes(
      fromStatus
    ) &&
    VALID_TICKET_STATUSES.includes(
      toStatus
    ) &&
    ALLOWED_TRANSITIONS[fromStatus]?.includes(
      toStatus
    ) === true
  );
};

/**
 * Check whether a specific role
 * is allowed to perform a transition.
 */
const canRoleTransition = (
  role,
  fromStatus,
  toStatus
) => {
  return (
    ROLE_TRANSITIONS[role]?.[fromStatus]?.includes(
      toStatus
    ) === true
  );
};

/**
 * Get all generally allowed next statuses.
 *
 * This is mainly used to provide
 * useful error responses to the client.
 */
const getAllowedNextStatuses = (
  status
) => {
  return ALLOWED_TRANSITIONS[status] || [];
};

module.exports = {
  VALID_TICKET_STATUSES,
  ALLOWED_TRANSITIONS,
  ROLE_TRANSITIONS,
  canTransition,
  canRoleTransition,
  getAllowedNextStatuses,
};

