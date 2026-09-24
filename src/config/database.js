require("dotenv").config();

const { Pool } = require("pg");

const host = process.env.DB_HOST || "";
const useSsl =
  String(process.env.DB_SSL || "").toLowerCase() === "true" ||
  /neon|aws|postgres/i.test(host);

const pool = new Pool({
  host,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  console.log("Connected to Neon PostgreSQL");
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

module.exports = pool;