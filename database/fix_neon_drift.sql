-- Fix Neon drift behind:
--   42P01 relation "ticket_reference_seq" does not exist (ticket.controller.js:746)
--   42703 column pm.priority_matrix_id does not exist (sla.controller.js:1032)
-- Run once against Neon (Neon SQL Editor / psql), then redeploy.
-- All statements are idempotent.

-- 0. Diagnose (run first, keep output)
SELECT to_regclass('public.ticket_reference_seq') AS ticket_reference_seq;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'priority_matrices'
ORDER BY ordinal_position;
SELECT to_regclass('public.priority_matrices') AS priority_matrices_tbl;

-- 1. Recreate missing ticket reference sequence (defined in database/schema.sql:478)
CREATE SEQUENCE IF NOT EXISTS ticket_reference_seq START WITH 1 INCREMENT BY 1;

-- 2. Advance it past existing HLP-XXXXXX numbers (seed uses HLP-0001..HLP-0036,
--    controller pads to HLP-000001). Prevents duplicate-key 23505 on next insert.
SELECT setval(
  'ticket_reference_seq',
  COALESCE(
    (SELECT MAX(NULLIF(regexp_replace(reference_number, '[^0-9]', '', 'g'), '')::int) FROM tickets),
    0
  ) + 1,
  false
);

-- 3. Normalize priority_matrices PK column to the API-contract name
--    used by schema.sql + sla.controller.js (priority_matrix_id).
--    Live DBs that still carry the legacy name hit 42703.
DO $$
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
END $$;

-- 4. Verify (both must return one row / correct columns)
SELECT nextval('ticket_reference_seq') AS smoke_nextval, setval('ticket_reference_seq', currval('ticket_reference_seq') - 1, true) AS rewound;
SELECT pm.priority_matrix_id, pm.impact, pm.urgency
FROM priority_matrices pm
LIMIT 1;
