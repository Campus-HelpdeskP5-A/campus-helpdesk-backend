// ============================================================================
// Alignment migration — aligns the LIVE database with the project requirements
// and the API contract used by the backend controllers + frontend.
// Run:  node database/migrate_alignment.js   (idempotent)
// ============================================================================
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: +(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

/** Rename a column only when the old name still exists. */
const rename = (table, from, to) => `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = '${table}' AND column_name = '${from}'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = '${table}' AND column_name = '${to}'
    ) THEN
      ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to};
    END IF;
  END $$;`;

const migrateTicketStatusEnum = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ticket_status'
      AND e.enumlabel = 'OPEN'
  ) THEN
    ALTER TYPE ticket_status RENAME TO ticket_status_legacy;

    CREATE TYPE ticket_status AS ENUM (
      'NEW',
      'TRIAGED',
      'ASSIGNED',
      'IN_PROGRESS',
      'WAITING',
      'RESOLVED',
      'REOPENED',
      'CLOSED'
    );

    ALTER TABLE tickets
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE TEXT USING status::TEXT;

    ALTER TABLE status_histories
      ALTER COLUMN old_status TYPE TEXT USING old_status::TEXT,
      ALTER COLUMN new_status TYPE TEXT USING new_status::TEXT;

    -- Existing OPEN/PENDING values are legacy data. They are deliberately
    -- migrated to the closest required persisted lifecycle state.
    UPDATE tickets
    SET status = CASE status
      WHEN 'OPEN' THEN 'NEW'
      WHEN 'PENDING' THEN 'WAITING'
      ELSE status
    END;

    UPDATE tickets t
    SET status = 'ASSIGNED'
    WHERE t.status = 'IN_PROGRESS'
      AND EXISTS (
        SELECT 1
        FROM assignments a
        WHERE a.ticket_id = t.ticket_id
          AND a.is_current = TRUE
      );

    UPDATE status_histories sh
    SET old_status = CASE
        WHEN mapped.old_value = mapped.new_value THEN NULL
        ELSE mapped.old_value
      END,
      new_status = mapped.new_value
    FROM (
      SELECT
        status_history_id,
        CASE old_status
          WHEN 'OPEN' THEN 'NEW'
          WHEN 'PENDING' THEN 'WAITING'
          ELSE old_status
        END AS old_value,
        CASE new_status
          WHEN 'OPEN' THEN 'NEW'
          WHEN 'PENDING' THEN 'WAITING'
          ELSE new_status
        END AS new_value
      FROM status_histories
    ) mapped
    WHERE sh.status_history_id = mapped.status_history_id;

    ALTER TABLE tickets
      ALTER COLUMN status TYPE ticket_status
      USING status::ticket_status,
      ALTER COLUMN status SET DEFAULT 'NEW';

    ALTER TABLE status_histories
      ALTER COLUMN old_status TYPE ticket_status
      USING old_status::ticket_status,
      ALTER COLUMN new_status TYPE ticket_status
      USING new_status::ticket_status;

    DROP TYPE ticket_status_legacy;
  END IF;
END $$;`;

const steps = [
  // Rebuild the enum because PostgreSQL cannot remove legacy enum labels.
  migrateTicketStatusEnum,
  `ALTER TYPE priority_level ADD VALUE IF NOT EXISTS 'CRITICAL'`,
  `ALTER TYPE ticket_event_type ADD VALUE IF NOT EXISTS 'UNASSIGNED'`,
  `ALTER TYPE ticket_event_type ADD VALUE IF NOT EXISTS 'ESCALATION_RESOLVED'`,
  `ALTER TYPE ticket_event_type ADD VALUE IF NOT EXISTS 'FEEDBACK_CREATED'`,
  `ALTER TYPE ticket_event_type ADD VALUE IF NOT EXISTS 'FEEDBACK_UPDATED'`,
  `ALTER TYPE ticket_event_type ADD VALUE IF NOT EXISTS 'FEEDBACK_DELETED'`,
  `ALTER TYPE ticket_event_type ADD VALUE IF NOT EXISTS 'COMMENT_DELETED'`,
  `ALTER TYPE ticket_event_type ADD VALUE IF NOT EXISTS 'ATTACHMENT_DELETED'`,

  // Column renames to the API-contract names used throughout the code.
  rename("ticket_events", "event_id", "ticket_event_id"),
  rename("ticket_events", "actor_id", "actor_user_id"),
  rename("status_histories", "created_at", "changed_at"),
  rename("notifications", "message", "body"),
  rename("comments", "author_id", "user_id"),
  rename("comments", "content", "body"),
  rename("audit_logs", "actor_id", "actor_user_id"),
  rename("work_logs", "technician_id", "user_id"),
  rename("escalations", "created_at", "triggered_at"),
  rename("escalations", "to_user_id", "assigned_to"),
  rename("attachments", "original_name", "file_name"),
  rename("attachments", "file_type", "mime_type"),
  rename("attachments", "file_path", "storage_path"),
  rename("priority_matrices", "matrix_id", "priority_matrix_id"),
  rename("priority_matrices", "id", "priority_matrix_id"),
  // Self-heal for Neon drift: ticket_reference_seq must exist because
  // ticket.controller.js createTicket() calls nextval('ticket_reference_seq').
  // schema.sql defines it, but live DBs created without full schema.sql miss it (42P01).
  `CREATE SEQUENCE IF NOT EXISTS ticket_reference_seq START WITH 1 INCREMENT BY 1`,
  // Advance the sequence past existing HLP-XXXXXX numbers so new tickets
  // never collide with seeded/manual rows (which use HLP-0001..HLP-0036).
  `SELECT setval(
    'ticket_reference_seq',
    COALESCE(
      (SELECT MAX(NULLIF(regexp_replace(reference_number, '[^0-9]', '', 'g'), '')::int) FROM tickets),
      0
    ) + 1,
    false
  )`,
  // Missing columns used by the backend.
  `ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMPTZ`,
  `ALTER TABLE escalations ADD COLUMN IF NOT EXISTS severity VARCHAR(20)`,
  `ALTER TABLE escalations ADD COLUMN IF NOT EXISTS assigned_team_id UUID REFERENCES support_teams(support_team_id)`,
  `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB`,
  `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB`,
  `ALTER TABLE ticket_events ADD COLUMN IF NOT EXISTS event_data JSONB`,
  `ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ`,
  `ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ`,
  `ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS note TEXT`,
  `ALTER TABLE ai_model_versions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ`,
  `ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN GENERATED ALWAYS AS (visibility = 'INTERNAL') STORED`,
  `ALTER TABLE assignments ALTER COLUMN assigned_to DROP NOT NULL`,
  `ALTER TABLE assignments ALTER COLUMN assigned_team_id DROP NOT NULL`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'chk_assignment_target'
     ) THEN
       ALTER TABLE assignments
       ADD CONSTRAINT chk_assignment_target
       CHECK (assigned_to IS NOT NULL OR assigned_team_id IS NOT NULL);
     END IF;
   END $$;`,

  // Defaults.
  `ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'NEW'`,
  `ALTER TABLE attachments ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP`,

  // Requirements §9: HIGH + HIGH resolves to HIGH.
  `UPDATE priority_matrices SET priority = 'HIGH'
   WHERE impact = 'HIGH' AND urgency = 'HIGH'`,

  // Re-derive stored ticket priorities from the matrix (real business rule).
  `UPDATE tickets t
   SET priority = pm.priority
   FROM priority_matrices pm
   WHERE pm.impact = t.impact
     AND pm.urgency = t.urgency
     AND pm.is_active = TRUE`,

  // Backfill SLA due dates from the configured profile targets
  // (same elapsed-minutes rule the backend uses on ticket creation).
  `UPDATE tickets t
   SET response_due_at = t.created_at + make_interval(mins => sp.response_target_minutes),
       resolution_due_at = t.created_at + make_interval(mins => sp.resolution_target_minutes)
   FROM sla_profiles sp
   WHERE sp.sla_profile_id = t.sla_profile_id
     AND t.response_due_at IS NULL`,

  // Attachments: created_at mirrors the real submission time.
  `UPDATE attachments SET created_at = submitted_at
   WHERE created_at IS NULL AND submitted_at IS NOT NULL`,
  `UPDATE attachments SET created_at = NOW() WHERE created_at IS NULL`,
  `ALTER TABLE attachments ALTER COLUMN created_at SET NOT NULL`,
  `ALTER TABLE attachments ALTER COLUMN created_at SET NOT NULL`,
];

(async () => {
  let n = 0;
  try {
    for (const sql of steps) {
      n += 1;
      await pool.query(sql);
      console.log(`[${n}/${steps.length}] ok`);
    }
    console.log("Migration completed successfully.");
  } catch (e) {
    console.error(`FAILED at step ${n}:`, e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
