// Prints facts needed by the E2E test — node db_facts.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { Pool } = require("pg");

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  const q = async (label, sql) => {
    try { console.log(label + ":", JSON.stringify((await pool.query(sql)).rows)); }
    catch (e) { console.log(label + " ERROR:", e.message); }
  };

  await q("USERS", `SELECT email, role, account_status FROM users ORDER BY role, email`);
  await q("STATUS_DIST", `SELECT status, COUNT(*)::int AS n FROM tickets GROUP BY status`);
  await q("PRIO_DIST", `SELECT priority, COUNT(*)::int AS n FROM tickets GROUP BY priority`);
  await q("HH", `SELECT priority FROM priority_matrices WHERE impact='HIGH' AND urgency='HIGH'`);
  await q("MEMBERSHIPS", `SELECT u.email, st.team_name, st.support_team_id, ut.user_id
    FROM user_teams ut
    JOIN users u ON u.user_id = ut.user_id
    JOIN support_teams st ON st.support_team_id = ut.support_team_id
    WHERE ut.left_at IS NULL`);
  await q("TEAMS", `SELECT support_team_id, team_name FROM support_teams ORDER BY team_name`);
  await q("PENDING_PRED", `SELECT ticket_id FROM predictions WHERE decision='PENDING' LIMIT 3`);
  await q("COUNTS", `SELECT (SELECT count(*) FROM tickets) AS tickets,
    (SELECT count(*) FROM status_histories) AS histories,
    (SELECT count(*) FROM ticket_events) AS events`);

  await pool.end();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
