const pool = require("../config/database");

/**
 * Idempotent production self-heal, executed once at server boot.
 *
 * Live databases created without the full schema.sql drift from the
 * API contract and cause 500s (42P01 ticket_reference_seq, 42703
 * priority_matrix_id). Every statement below is safe to re-run and
 * never moves data backward. Failures are logged and never prevent
 * the server from starting.
 */
const ensureDbAlignment = async () => {
  await pool.query(
    `CREATE SEQUENCE IF NOT EXISTS ticket_reference_seq START WITH 1 INCREMENT BY 1`
  );

  await pool.query(
    `SELECT setval(
       'ticket_reference_seq',
       GREATEST(
         (SELECT last_value FROM ticket_reference_seq),
         COALESCE(
           (SELECT MAX(NULLIF(regexp_replace(reference_number, '[^0-9]', '', 'g'), '')::int) FROM tickets),
           0
         )
       ),
       true
     )`
  );

  await pool.query(
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'priority_matrices' AND column_name = 'matrix_id'
       ) AND NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'priority_matrices' AND column_name = 'priority_matrix_id'
       ) THEN
         ALTER TABLE priority_matrices RENAME COLUMN matrix_id TO priority_matrix_id;
       END IF;

       IF EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'priority_matrices' AND column_name = 'id'
       ) AND NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'priority_matrices' AND column_name = 'priority_matrix_id'
       ) THEN
         ALTER TABLE priority_matrices RENAME COLUMN id TO priority_matrix_id;
       END IF;
     END $$;`
  );

  console.log("DB alignment check completed");
};

module.exports = { ensureDbAlignment };
