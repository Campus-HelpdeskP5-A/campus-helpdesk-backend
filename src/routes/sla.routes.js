const express = require("express");

const {
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
} = require("../controllers/sla.controller");

const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Business Hours
|--------------------------------------------------------------------------
*/

// Read
router.get(
  "/business-hours",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getBusinessHours
);

router.get(
  "/business-hours/:id",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getBusinessHoursById
);

// Create / Update - Manager only
router.post(
  "/business-hours",
  authenticate,
  authorize("MANAGER"),
  createBusinessHours
);

router.put(
  "/business-hours/:id",
  authenticate,
  authorize("MANAGER"),
  updateBusinessHours
);

/*
|--------------------------------------------------------------------------
| SLA Profiles
|--------------------------------------------------------------------------
*/

router.get(
  "/profiles",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getSlaProfiles
);

router.get(
  "/profiles/:id",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getSlaProfileById
);

router.post(
  "/profiles",
  authenticate,
  authorize("MANAGER"),
  createSlaProfile
);

router.put(
  "/profiles/:id",
  authenticate,
  authorize("MANAGER"),
  updateSlaProfile
);

/*
|--------------------------------------------------------------------------
| Priority Matrix
|--------------------------------------------------------------------------
*/

router.get(
  "/priority-matrix",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  getPriorityMatrix
);

// IMPORTANT:
// This route must come before /:id routes.
router.get(
  "/priority-matrix/resolve",
  authenticate,
  authorize(
    "REPORTER",
    "AGENT",
    "TECHNICIAN",
    "MANAGER",
    "AUDITOR"
  ),
  resolvePriority
);

router.post(
  "/priority-matrix",
  authenticate,
  authorize("MANAGER"),
  createPriorityMatrix
);

router.put(
  "/priority-matrix/:id",
  authenticate,
  authorize("MANAGER"),
  updatePriorityMatrix
);

module.exports = router;