const PRIORITY_MATRIX = Object.freeze({
  LOW: Object.freeze({
    LOW: "LOW",
    MEDIUM: "LOW",
    HIGH: "MEDIUM",
  }),
  MEDIUM: Object.freeze({
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
  }),
  HIGH: Object.freeze({
    LOW: "MEDIUM",
    MEDIUM: "HIGH",
    HIGH: "HIGH",
  }),
});

const getCanonicalPriority = (impact, urgency) =>
  PRIORITY_MATRIX[impact]?.[urgency] || null;

module.exports = {
  PRIORITY_MATRIX,
  getCanonicalPriority,
};
