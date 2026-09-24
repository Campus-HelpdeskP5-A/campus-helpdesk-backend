require("dotenv").config();
const app = require("./app");
const {
  startSlaMonitor,
} = require("./services/sla.service");

const PORT = process.env.PORT || 5000;

startSlaMonitor();

app.listen(PORT, () => {
  console.log(`Campus Helpdesk API running on port ${PORT}`);
});