-- =========================================================
-- HLP — Campus Helpdesk & Maintenance Tickets
-- FINAL DATABASE SCHEMA
-- PostgreSQL / Neon
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,

    role VARCHAR(30) NOT NULL
        CHECK (role IN (
            'REPORTER',
            'AGENT',
            'TECHNICIAN',
            'MANAGER',
            'AUDITOR'
        )),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    approved_by UUID NULL,
    approved_at TIMESTAMPTZ NULL,

    created_by UUID NULL,
    updated_by UUID NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- SUPPORT TEAMS
-- =========================================================

CREATE TABLE support_teams (
    support_team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    team_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- LOCATIONS
-- =========================================================

CREATE TABLE locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    building VARCHAR(100) NOT NULL,
    floor VARCHAR(50) NULL,
    room_code VARCHAR(50) NOT NULL,
    description TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (building, room_code)
);

-- =========================================================
-- BUSINESS HOURS
-- =========================================================

CREATE TABLE business_hours (
    business_hours_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,
    timezone VARCHAR(100) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE business_hours_days (
    business_hours_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL,

    start_time TIME NULL,
    end_time TIME NULL,

    is_working_day BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (business_hours_id, day_of_week),

    CONSTRAINT fk_business_hours_days_hours
        FOREIGN KEY (business_hours_id)
        REFERENCES business_hours(business_hours_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_business_hours_day
        CHECK (day_of_week BETWEEN 0 AND 6),

    CONSTRAINT chk_business_hours_time
        CHECK (
            (start_time IS NULL AND end_time IS NULL)
            OR
            (start_time < end_time)
        )
);

-- =========================================================
-- CATEGORIES
-- =========================================================

CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,

    default_team_id UUID NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- SLA PROFILES
-- =========================================================

CREATE TABLE sla_profiles (
    sla_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,

    response_target_minutes INTEGER NOT NULL
        CHECK (response_target_minutes > 0),

    resolution_target_minutes INTEGER NOT NULL
        CHECK (resolution_target_minutes > 0),

    business_hours_id UUID NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sla_business_hours
        FOREIGN KEY (business_hours_id)
        REFERENCES business_hours(business_hours_id)
);

-- =========================================================
-- PRIORITY MATRICES
-- =========================================================

CREATE TABLE priority_matrices (
    priority_matrix_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    impact VARCHAR(30) NOT NULL,
    urgency VARCHAR(30) NOT NULL,
    priority VARCHAR(30) NOT NULL,

    sla_profile_id UUID NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_priority_sla
        FOREIGN KEY (sla_profile_id)
        REFERENCES sla_profiles(sla_profile_id),

    CONSTRAINT uq_priority_active
        UNIQUE (impact, urgency, is_active)
);

-- =========================================================
-- ASSETS
-- =========================================================

CREATE TABLE assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    asset_tag VARCHAR(100) NOT NULL UNIQUE,
    asset_type VARCHAR(100) NOT NULL,
    asset_name VARCHAR(150) NULL,

    location_id UUID NOT NULL,

    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_assets_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id)
);

-- =========================================================
-- TICKETS
-- =========================================================

CREATE TABLE tickets (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reference_number VARCHAR(50) NOT NULL UNIQUE,

    reporter_id UUID NOT NULL,
    category_id UUID NOT NULL,
    location_id UUID NOT NULL,
    asset_id UUID NULL,
    sla_profile_id UUID NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    impact VARCHAR(30) NOT NULL,
    urgency VARCHAR(30) NOT NULL,
    priority VARCHAR(30) NOT NULL,

    status VARCHAR(40) NOT NULL,

    response_due_at TIMESTAMPTZ NOT NULL,
    resolution_due_at TIMESTAMPTZ NOT NULL,

    first_response_at TIMESTAMPTZ NULL,
    resolved_at TIMESTAMPTZ NULL,
    closed_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ticket_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_ticket_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id),

    CONSTRAINT fk_ticket_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id),

    CONSTRAINT fk_ticket_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(asset_id),

    CONSTRAINT fk_ticket_sla
        FOREIGN KEY (sla_profile_id)
        REFERENCES sla_profiles(sla_profile_id)
);

-- =========================================================
-- USER TEAMS
-- =========================================================

CREATE TABLE user_teams (
    user_id UUID NOT NULL,
    support_team_id UUID NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ NULL,

    PRIMARY KEY (user_id, support_team_id),

    CONSTRAINT fk_user_team_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_team_support_team
        FOREIGN KEY (support_team_id)
        REFERENCES support_teams(support_team_id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_user_primary_team
ON user_teams(user_id)
WHERE is_primary = TRUE;

-- =========================================================
-- TECHNICIAN PROFILES
-- =========================================================

CREATE TABLE technician_profiles (
    user_id UUID PRIMARY KEY,

    max_active_tickets INTEGER NOT NULL DEFAULT 5
        CHECK (max_active_tickets > 0),

    skills TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_technician_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- =========================================================
-- ASSIGNMENTS
-- =========================================================

CREATE TABLE assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    assigned_to UUID NULL,
    assigned_team_id UUID NULL,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ NULL,

    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    assigned_by UUID NULL,

    reason TEXT NULL,

    CONSTRAINT fk_assignment_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_user
        FOREIGN KEY (assigned_to)
        REFERENCES users(user_id),

    CONSTRAINT fk_assignment_team
        FOREIGN KEY (assigned_team_id)
        REFERENCES support_teams(support_team_id),

    CONSTRAINT fk_assignment_assigned_by
        FOREIGN KEY (assigned_by)
        REFERENCES users(user_id),

    CONSTRAINT chk_assignment_target
        CHECK (
            assigned_to IS NOT NULL
            OR
            assigned_team_id IS NOT NULL
        ),

    CONSTRAINT chk_assignment_currency
        CHECK (
            (is_current = TRUE AND unassigned_at IS NULL)
            OR
            (is_current = FALSE AND unassigned_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX uq_current_ticket_assignment
ON assignments(ticket_id)
WHERE is_current = TRUE;

-- =========================================================
-- STATUS HISTORIES
-- =========================================================

CREATE TABLE status_histories (
    status_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    old_status VARCHAR(40) NULL,
    new_status VARCHAR(40) NOT NULL,

    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    changed_by UUID NOT NULL,

    reason TEXT NULL,

    CONSTRAINT fk_status_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_status_user
        FOREIGN KEY (changed_by)
        REFERENCES users(user_id),

    CONSTRAINT chk_status_transition
        CHECK (
            old_status IS NULL
            OR
            old_status <> new_status
        )
);

-- =========================================================
-- TICKET EVENTS
-- =========================================================

CREATE TABLE ticket_events (
    ticket_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    event_type VARCHAR(100) NOT NULL,

    actor_user_id UUID NULL,

    event_data JSONB NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ticket_event_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_event_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users(user_id)
);

-- =========================================================
-- COMMENTS
-- =========================================================

CREATE TABLE comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,

    body TEXT NOT NULL,

    is_internal BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_comment_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

-- =========================================================
-- ATTACHMENTS
-- =========================================================

CREATE TABLE attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,
    uploaded_by UUID NOT NULL,

    file_uuid UUID NOT NULL UNIQUE,

    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NULL,

    file_size BIGINT NOT NULL
        CHECK (file_size >= 0),

    storage_path TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_attachment_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attachment_user
        FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
);

-- =========================================================
-- WORK LOGS
-- =========================================================

CREATE TABLE work_logs (
    work_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,

    started_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,

    time_spent_minutes INTEGER NOT NULL
        CHECK (time_spent_minutes >= 0),

    note TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_worklog_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_worklog_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);

-- =========================================================
-- FEEDBACK
-- =========================================================

CREATE TABLE feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,

    rating INTEGER NULL
        CHECK (rating BETWEEN 1 AND 5),

    comment TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_feedback_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_feedback_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT uq_feedback_ticket_user
        UNIQUE (ticket_id, user_id)
);

-- =========================================================
-- ESCALATIONS
-- =========================================================

CREATE TABLE escalations (
    escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    trigger_type VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL,

    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    assigned_to UUID NULL,
    assigned_team_id UUID NULL,

    reason TEXT NULL,

    resolved_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_escalation_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_escalation_user
        FOREIGN KEY (assigned_to)
        REFERENCES users(user_id),

    CONSTRAINT fk_escalation_team
        FOREIGN KEY (assigned_team_id)
        REFERENCES support_teams(support_team_id),

    CONSTRAINT chk_escalation_target
        CHECK (
            assigned_to IS NOT NULL
            OR
            assigned_team_id IS NOT NULL
        )
);

-- =========================================================
-- AI MODEL VERSIONS
-- =========================================================

CREATE TABLE ai_model_versions (
    model_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    model_name VARCHAR(150) NOT NULL,
    version VARCHAR(50) NOT NULL,

    model_type VARCHAR(100) NOT NULL,

    training_dataset_version VARCHAR(100) NULL,
    feature_schema_version VARCHAR(100) NULL,

    trained_at TIMESTAMPTZ NULL,
    deployed_at TIMESTAMPTZ NULL,

    metrics JSONB NULL,

    is_active BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (model_name, version)
);

-- =========================================================
-- PREDICTIONS
-- =========================================================

CREATE TABLE predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,
    model_version_id UUID NOT NULL,

    prediction_type VARCHAR(50) NOT NULL,
    predicted_value VARCHAR(100) NOT NULL,

    confidence NUMERIC(5,4) NULL
        CHECK (confidence BETWEEN 0 AND 1),

    prediction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    decision VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    override_value VARCHAR(100) NULL,

    reviewed_by UUID NULL,
    reviewed_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prediction_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_prediction_model
        FOREIGN KEY (model_version_id)
        REFERENCES ai_model_versions(model_version_id),

    CONSTRAINT fk_prediction_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id),

    CONSTRAINT chk_prediction_review
        CHECK (
            (
                decision = 'PENDING'
                AND reviewed_by IS NULL
            )
            OR
            (
                decision IN ('ACCEPTED', 'OVERRIDDEN')
                AND reviewed_by IS NOT NULL
            )
        )
);

-- =========================================================
-- TICKET RELATIONS
-- =========================================================

CREATE TABLE ticket_relations (
    ticket_relation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,
    related_ticket_id UUID NOT NULL,

    relation_type VARCHAR(50) NOT NULL,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_relation_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_relation_related_ticket
        FOREIGN KEY (related_ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_relation_user
        FOREIGN KEY (created_by)
        REFERENCES users(user_id),

    CONSTRAINT chk_relation_not_self
        CHECK (ticket_id <> related_ticket_id),

    CONSTRAINT uq_ticket_relation
        UNIQUE (
            ticket_id,
            related_ticket_id,
            relation_type
        )
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    recipient_user_id UUID NOT NULL,

    ticket_id UUID NULL,
    related_user_id UUID NULL,

    notification_type VARCHAR(100) NOT NULL,

    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipient_user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_related_user
        FOREIGN KEY (related_user_id)
        REFERENCES users(user_id),

    CONSTRAINT chk_notification_read
        CHECK (
            (is_read = TRUE AND read_at IS NOT NULL)
            OR
            is_read = FALSE
        )
);

-- =========================================================
-- AUDIT LOGS
-- =========================================================

CREATE TABLE audit_logs (
    audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_user_id UUID NULL,

    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,

    action VARCHAR(100) NOT NULL,

    old_values JSONB NULL,
    new_values JSONB NULL,

    ip_address INET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_audit_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users(user_id)
);

-- =========================================================
-- SELF REFERENCES FOR USERS
-- =========================================================

ALTER TABLE users
    ADD CONSTRAINT fk_users_approved_by
    FOREIGN KEY (approved_by)
    REFERENCES users(user_id);

ALTER TABLE users
    ADD CONSTRAINT fk_users_created_by
    FOREIGN KEY (created_by)
    REFERENCES users(user_id);

ALTER TABLE users
    ADD CONSTRAINT fk_users_updated_by
    FOREIGN KEY (updated_by)
    REFERENCES users(user_id);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_tickets_reporter
    ON tickets(reporter_id);

CREATE INDEX idx_tickets_status
    ON tickets(status);

CREATE INDEX idx_tickets_priority
    ON tickets(priority);

CREATE INDEX idx_tickets_category
    ON tickets(category_id);

CREATE INDEX idx_tickets_location
    ON tickets(location_id);

CREATE INDEX idx_tickets_created_at
    ON tickets(created_at);

CREATE INDEX idx_assignments_ticket
    ON assignments(ticket_id);

CREATE INDEX idx_assignments_user
    ON assignments(assigned_to);

CREATE INDEX idx_assignments_team
    ON assignments(assigned_team_id);

CREATE INDEX idx_status_histories_ticket
    ON status_histories(ticket_id);

CREATE INDEX idx_ticket_events_ticket
    ON ticket_events(ticket_id);

CREATE INDEX idx_comments_ticket
    ON comments(ticket_id);

CREATE INDEX idx_attachments_ticket
    ON attachments(ticket_id);

CREATE INDEX idx_notifications_recipient
    ON notifications(recipient_user_id);

CREATE INDEX idx_notifications_unread
    ON notifications(recipient_user_id, is_read);

CREATE INDEX idx_predictions_ticket
    ON predictions(ticket_id);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id);

COMMIT;

-- =========================================================
-- END OF SCHEMA
-- =========================================================