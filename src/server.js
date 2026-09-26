require("dotenv").config();
const app = require("./app");
const {
  startSlaMonitor,
} = require("./services/sla.service");
const {
  ensureDbAlignment,
} = require("./utils/bootAlign");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await ensureDbAlignment();
  } catch (error) {
    console.error(
      "DB alignment failed (server starting anyway):",
      error.message
    );
  }

  startSlaMonitor();

  app.listen(PORT, () => {
    console.log(`Campus Helpdesk API running on port ${PORT}`);
  });
})();