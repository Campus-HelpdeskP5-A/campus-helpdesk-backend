const pool = require("./src/config/database");

pool.query(`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  ORDER BY table_name
`)
  .then((result) => {
    console.log("Tables in database:");
    result.rows.forEach((row) => console.log("  -", row.table_name));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
