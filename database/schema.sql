-- =========================================================
-- HLP — Campus Helpdesk & Maintenance Tickets
-- FINAL PostgreSQL DATABASE SCHEMA
-- Backend + Analytics Compatible Version
-- 25 ENTITIES
-- =========================================================


-- =========================================================
-- 0. EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =========================================================
-- 1. USERS
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

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD CONSTRAINT fk_users_approved_by
FOREIGN KEY (approved_by)
REFERENCES users(user_id)
ON DELETE RESTRICT;

ALTER TABLE users
ADD CONSTRAINT fk_users_created_by
FOREIGN KEY (created_by)
REFERENCES users(user_id)
ON DELETE RESTRICT;

ALTER TABLE users
ADD CONSTRAINT fk_users_updated_by
FOREIGN KEY (updated_by)
REFERENCES users(user_id)
ON DELETE RESTRICT;


-- =========================================================
-- 2. SUPPORT TEAMS
-- =========================================================

CREATE TABLE support_teams (
    support_team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    team_name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 3. USER TEAMS
-- =========================================================

CREATE TABLE user_teams (
    user_id UUID NOT NULL,
    support_team_id UUID NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ NULL,

    PRIMARY KEY (user_id, support_team_id),

    CONSTRAINT fk_user_teams_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_user_teams_team
        FOREIGN KEY (support_team_id)
        REFERENCES support_teams(support_team_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_user_team_dates
        CHECK (
            left_at IS NULL
            OR left_at >= joined_at
        )
);

CREATE UNIQUE INDEX uq_user_primary_team
ON user_teams(user_id)
WHERE is_primary = TRUE;


-- =========================================================
-- 4. TECHNICIAN PROFILES
-- =========================================================

CREATE TABLE technician_profiles (
    user_id UUID PRIMARY KEY,

    max_active_tickets INTEGER NOT NULL DEFAULT 5,

    skills TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_technician_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_technician_capacity
        CHECK (max_active_tickets > 0)
);


-- =========================================================
-- 5. CATEGORIES
-- =========================================================

CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,

    default_team_id UUID NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_default_team
        FOREIGN KEY (default_team_id)
        REFERENCES support_teams(support_team_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 6. LOCATIONS
-- =========================================================

CREATE TABLE locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    building VARCHAR(150) NOT NULL,
    floor VARCHAR(50),
    room_code VARCHAR(100) NOT NULL,

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_location
        UNIQUE (building, room_code)
);


-- =========================================================
-- 7. ASSETS
-- =========================================================

CREATE TABLE assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    asset_tag VARCHAR(100) NOT NULL UNIQUE,
    asset_type VARCHAR(100) NOT NULL,
    asset_name VARCHAR(150),

    location_id UUID NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assets_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 8. BUSINESS HOURS
-- =========================================================

CREATE TABLE business_hours (
    business_hours_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL UNIQUE,

    timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Cairo',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 9. BUSINESS HOURS DAYS
-- =========================================================

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

    CONSTRAINT chk_day_of_week
        CHECK (day_of_week BETWEEN 0 AND 6),

    CONSTRAINT chk_business_time
        CHECK (
            (
                start_time IS NULL
                AND end_time IS NULL
            )
            OR
            start_time < end_time
        ),

    CONSTRAINT chk_non_working_day_hours
        CHECK (
            is_working_day = TRUE
            OR (
                start_time IS NULL
                AND end_time IS NULL
            )
        )
);


-- =========================================================
-- 10. SLA PROFILES
-- =========================================================

CREATE TABLE sla_profiles (
    sla_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL UNIQUE,

    response_target_minutes INTEGER NOT NULL,
    resolution_target_minutes INTEGER NOT NULL,

    business_hours_id UUID NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sla_profiles_business_hours
        FOREIGN KEY (business_hours_id)
        REFERENCES business_hours(business_hours_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_response_target
        CHECK (response_target_minutes > 0),

    CONSTRAINT chk_resolution_target
        CHECK (resolution_target_minutes > 0)
);


-- =========================================================
-- 11. PRIORITY MATRICES
-- =========================================================

CREATE TABLE priority_matrices (
    priority_matrix_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    impact VARCHAR(30) NOT NULL
        CHECK (impact IN (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        )),

    urgency VARCHAR(30) NOT NULL
        CHECK (urgency IN (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        )),

    priority VARCHAR(30) NOT NULL
        CHECK (priority IN (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        )),

    sla_profile_id UUID NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_priority_matrix_sla
        FOREIGN KEY (sla_profile_id)
        REFERENCES sla_profiles(sla_profile_id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_active_priority_matrix
ON priority_matrices(impact, urgency)
WHERE is_active = TRUE;


-- =========================================================
-- 12. TICKETS
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

    impact VARCHAR(30) NOT NULL
        CHECK (impact IN (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        )),

    urgency VARCHAR(30) NOT NULL
        CHECK (urgency IN (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        )),

    priority VARCHAR(30) NOT NULL
        CHECK (priority IN (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        )),

    -- =====================================================
    -- OFFICIAL TICKET STATUSES
    -- =====================================================
    -- OPEN
    -- IN_PROGRESS
    -- ON_HOLD
    -- RESOLVED
    -- CLOSED
    --
    -- ASSIGNED is represented by assignments.
    -- ESCALATED is represented by escalations.
    -- =====================================================

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN (
            'OPEN',
            'IN_PROGRESS',
            'ON_HOLD',
            'RESOLVED',
            'CLOSED'
        )),

    response_due_at TIMESTAMPTZ NOT NULL,
    resolution_due_at TIMESTAMPTZ NOT NULL,

    first_response_at TIMESTAMPTZ NULL,
    resolved_at TIMESTAMPTZ NULL,
    closed_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tickets_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tickets_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tickets_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tickets_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(asset_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tickets_sla_profile
        FOREIGN KEY (sla_profile_id)
        REFERENCES sla_profiles(sla_profile_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ticket_sla_dates
        CHECK (
            response_due_at <= resolution_due_at
        ),

    CONSTRAINT chk_ticket_resolution_dates
        CHECK (
            resolved_at IS NULL
            OR resolved_at >= created_at
        ),

    CONSTRAINT chk_ticket_closure_dates
        CHECK (
            closed_at IS NULL
            OR (
                resolved_at IS NOT NULL
                AND closed_at >= resolved_at
            )
        ),

    CONSTRAINT chk_ticket_first_response
        CHECK (
            first_response_at IS NULL
            OR first_response_at >= created_at
        )
);


-- =========================================================
-- 13. ASSIGNMENTS
-- =========================================================

CREATE TABLE assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    assigned_to UUID NULL,
    assigned_team_id UUID NULL,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMPTZ NULL,

    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    assigned_by UUID NULL,

    reason TEXT,

    CONSTRAINT fk_assignments_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignments_user
        FOREIGN KEY (assigned_to)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assignments_team
        FOREIGN KEY (assigned_team_id)
        REFERENCES support_teams(support_team_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assignments_assigned_by
        FOREIGN KEY (assigned_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_assignment_dates
        CHECK (
            unassigned_at IS NULL
            OR unassigned_at >= assigned_at
        ),

    CONSTRAINT chk_assignment_current
        CHECK (
            is_current = FALSE
            OR unassigned_at IS NULL
        ),

    CONSTRAINT chk_assignment_target
        CHECK (
            assigned_to IS NOT NULL
            OR assigned_team_id IS NOT NULL
        )
);

CREATE UNIQUE INDEX uq_current_ticket_assignment
ON assignments(ticket_id)
WHERE is_current = TRUE;


-- =========================================================
-- 14. STATUS HISTORIES
-- =========================================================

CREATE TABLE status_histories (
    status_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    old_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NOT NULL,

    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    changed_by UUID NOT NULL,

    reason TEXT,

    CONSTRAINT fk_status_history_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_status_history_user
        FOREIGN KEY (changed_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_status_history_old_status
        CHECK (
            old_status IS NULL
            OR old_status IN (
                'OPEN',
                'IN_PROGRESS',
                'ON_HOLD',
                'RESOLVED',
                'CLOSED'
            )
        ),

    CONSTRAINT chk_status_history_new_status
        CHECK (
            new_status IN (
                'OPEN',
                'IN_PROGRESS',
                'ON_HOLD',
                'RESOLVED',
                'CLOSED'
            )
        ),

    CONSTRAINT chk_status_change
        CHECK (
            old_status IS NULL
            OR old_status <> new_status
        )
);


-- =========================================================
-- 15. TICKET EVENTS
-- =========================================================
-- IMPORTANT:
-- This structure matches the current Backend controllers.
--
-- Backend uses:
--   event_data
--   created_at
--
-- Therefore we DO NOT use:
--   metadata
--   event_timestamp
-- =========================================================

CREATE TABLE ticket_events (
    ticket_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    event_type VARCHAR(100) NOT NULL,

    actor_user_id UUID NULL,

    event_data JSONB NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ticket_events_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_events_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 16. COMMENTS
-- =========================================================

CREATE TABLE comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    user_id UUID NOT NULL,

    body TEXT NOT NULL,

    is_internal BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comments_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 17. ATTACHMENTS
-- =========================================================

CREATE TABLE attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    uploaded_by UUID NOT NULL,

    file_uuid UUID NOT NULL UNIQUE,

    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(150),
    file_size BIGINT NOT NULL,

    storage_path TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attachments_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attachments_user
        FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_attachment_size
        CHECK (file_size >= 0)
);


-- =========================================================
-- 18. WORK LOGS
-- =========================================================

CREATE TABLE work_logs (
    work_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    user_id UUID NOT NULL,

    started_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,

    time_spent_minutes INTEGER NOT NULL DEFAULT 0,

    note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_work_logs_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_work_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_work_log_time
        CHECK (time_spent_minutes >= 0),

    CONSTRAINT chk_work_log_dates
        CHECK (
            ended_at IS NULL
            OR started_at IS NULL
            OR ended_at >= started_at
        )
);


-- =========================================================
-- 19. FEEDBACK
-- =========================================================

CREATE TABLE feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    user_id UUID NOT NULL,

    rating INTEGER NULL,

    comment TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_feedback_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_feedback_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_feedback_rating
        CHECK (
            rating IS NULL
            OR rating BETWEEN 1 AND 5
        ),

    CONSTRAINT uq_feedback_ticket_user
        UNIQUE (ticket_id, user_id)
);


-- =========================================================
-- 20. ESCALATIONS
-- =========================================================

CREATE TABLE escalations (
    escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    trigger_type VARCHAR(50) NOT NULL
        CHECK (trigger_type IN (
            'SLA_RISK',
            'SLA_BREACH',
            'MANUAL'
        )),

    severity VARCHAR(30) NOT NULL
        CHECK (severity IN (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        )),

    triggered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    assigned_to UUID NULL,
    assigned_team_id UUID NULL,

    reason TEXT,

    resolved_at TIMESTAMPTZ NULL,

    CONSTRAINT fk_escalations_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_escalations_user
        FOREIGN KEY (assigned_to)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_escalations_team
        FOREIGN KEY (assigned_team_id)
        REFERENCES support_teams(support_team_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_escalation_target
        CHECK (
            assigned_to IS NOT NULL
            OR assigned_team_id IS NOT NULL
        ),

    CONSTRAINT chk_escalation_resolved
        CHECK (
            resolved_at IS NULL
            OR resolved_at >= triggered_at
        )
);


-- =========================================================
-- 21. AI MODEL VERSIONS
-- =========================================================

CREATE TABLE ai_model_versions (
    model_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    model_name VARCHAR(150) NOT NULL,
    version VARCHAR(50) NOT NULL,

    model_type VARCHAR(100) NOT NULL,

    training_dataset_version VARCHAR(100),
    feature_schema_version VARCHAR(100),

    trained_at TIMESTAMPTZ,
    deployed_at TIMESTAMPTZ,

    metrics JSONB NULL,

    is_active BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_ai_model_version
        UNIQUE (model_name, version)
);


-- =========================================================
-- 22. PREDICTIONS
-- =========================================================

CREATE TABLE predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    model_version_id UUID NOT NULL,

    prediction_type VARCHAR(50) NOT NULL
        CHECK (prediction_type IN (
            'CATEGORY',
            'SLA_RISK'
        )),

    predicted_value VARCHAR(255) NOT NULL,

    confidence NUMERIC(5,4) NULL,

    prediction_timestamp TIMESTAMPTZ NOT NULL,

    decision VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (decision IN (
            'PENDING',
            'ACCEPTED',
            'OVERRIDDEN'
        )),

    override_value VARCHAR(255) NULL,

    reviewed_by UUID NULL,
    reviewed_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_predictions_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_predictions_model
        FOREIGN KEY (model_version_id)
        REFERENCES ai_model_versions(model_version_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_predictions_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_prediction_confidence
        CHECK (
            confidence IS NULL
            OR (
                confidence >= 0
                AND confidence <= 1
            )
        ),

    CONSTRAINT chk_prediction_review
        CHECK (
            (
                decision = 'PENDING'
                AND reviewed_by IS NULL
                AND reviewed_at IS NULL
            )
            OR
            (
                decision IN ('ACCEPTED', 'OVERRIDDEN')
                AND reviewed_by IS NOT NULL
                AND reviewed_at IS NOT NULL
            )
        ),

    CONSTRAINT chk_prediction_override
        CHECK (
            decision <> 'OVERRIDDEN'
            OR override_value IS NOT NULL
        )
);


-- =========================================================
-- 23. TICKET RELATIONS
-- =========================================================

CREATE TABLE ticket_relations (
    ticket_relation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    related_ticket_id UUID NOT NULL,

    relation_type VARCHAR(50) NOT NULL
        CHECK (relation_type IN (
            'DUPLICATE',
            'RELATED',
            'PARENT',
            'CHILD',
            'BLOCKS',
            'BLOCKED_BY'
        )),

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ticket_relations_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_relations_related
        FOREIGN KEY (related_ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_relations_creator
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_ticket_relation_self
        CHECK (
            ticket_id <> related_ticket_id
        ),

    CONSTRAINT uq_ticket_relation
        UNIQUE (
            ticket_id,
            related_ticket_id,
            relation_type
        )
);


-- =========================================================
-- 24. NOTIFICATIONS
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

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_related_user
        FOREIGN KEY (related_user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_notification_read_state
        CHECK (
            (
                is_read = FALSE
                AND read_at IS NULL
            )
            OR
            (
                is_read = TRUE
                AND read_at IS NOT NULL
            )
        )
);


-- =========================================================
-- 25. AUDIT LOGS
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

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- INDEXES
-- =========================================================


-- USERS
CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_users_active
ON users(is_active);


-- USER TEAMS
CREATE INDEX idx_user_teams_team
ON user_teams(support_team_id);

CREATE INDEX idx_user_teams_user
ON user_teams(user_id);


-- TECHNICIAN PROFILES
CREATE INDEX idx_technician_profiles_capacity
ON technician_profiles(max_active_tickets);


-- CATEGORIES
CREATE INDEX idx_categories_default_team
ON categories(default_team_id);


-- LOCATIONS
CREATE INDEX idx_locations_building
ON locations(building);


-- ASSETS
CREATE INDEX idx_assets_location
ON assets(location_id);

CREATE INDEX idx_assets_type
ON assets(asset_type);


-- SLA
CREATE INDEX idx_sla_profiles_business_hours
ON sla_profiles(business_hours_id);


-- PRIORITY MATRIX
CREATE INDEX idx_priority_matrices_sla
ON priority_matrices(sla_profile_id);


-- TICKETS
CREATE INDEX idx_tickets_reporter
ON tickets(reporter_id);

CREATE INDEX idx_tickets_category
ON tickets(category_id);

CREATE INDEX idx_tickets_location
ON tickets(location_id);

CREATE INDEX idx_tickets_asset
ON tickets(asset_id);

CREATE INDEX idx_tickets_status
ON tickets(status);

CREATE INDEX idx_tickets_priority
ON tickets(priority);

CREATE INDEX idx_tickets_impact
ON tickets(impact);

CREATE INDEX idx_tickets_urgency
ON tickets(urgency);

CREATE INDEX idx_tickets_created_at
ON tickets(created_at);

CREATE INDEX idx_tickets_first_response
ON tickets(first_response_at);

CREATE INDEX idx_tickets_resolved_at
ON tickets(resolved_at);

CREATE INDEX idx_tickets_resolution_due
ON tickets(resolution_due_at);

CREATE INDEX idx_tickets_response_due
ON tickets(response_due_at);

CREATE INDEX idx_tickets_unresolved
ON tickets(status, resolution_due_at)
WHERE status IN (
    'OPEN',
    'IN_PROGRESS',
    'ON_HOLD'
);


-- ASSIGNMENTS
CREATE INDEX idx_assignments_ticket
ON assignments(ticket_id);

CREATE INDEX idx_assignments_user
ON assignments(assigned_to);

CREATE INDEX idx_assignments_team
ON assignments(assigned_team_id);

CREATE INDEX idx_assignments_current
ON assignments(is_current);


-- STATUS HISTORY
CREATE INDEX idx_status_history_ticket_time
ON status_histories(ticket_id, changed_at);

CREATE INDEX idx_status_history_status
ON status_histories(new_status);

CREATE INDEX idx_status_history_changed_by
ON status_histories(changed_by);


-- EVENTS
CREATE INDEX idx_ticket_events_ticket_time
ON ticket_events(ticket_id, created_at);

CREATE INDEX idx_ticket_events_type
ON ticket_events(event_type);

CREATE INDEX idx_ticket_events_actor
ON ticket_events(actor_user_id);


-- COMMENTS
CREATE INDEX idx_comments_ticket_time
ON comments(ticket_id, created_at);

CREATE INDEX idx_comments_user
ON comments(user_id);


-- ATTACHMENTS
CREATE INDEX idx_attachments_ticket
ON attachments(ticket_id);

CREATE INDEX idx_attachments_uploaded_by
ON attachments(uploaded_by);


-- WORK LOGS
CREATE INDEX idx_work_logs_ticket
ON work_logs(ticket_id);

CREATE INDEX idx_work_logs_user
ON work_logs(user_id);

CREATE INDEX idx_work_logs_created_at
ON work_logs(created_at);


-- FEEDBACK
CREATE INDEX idx_feedback_ticket
ON feedback(ticket_id);

CREATE INDEX idx_feedback_rating
ON feedback(rating);

CREATE INDEX idx_feedback_created_at
ON feedback(created_at);


-- ESCALATIONS
CREATE INDEX idx_escalations_ticket
ON escalations(ticket_id);

CREATE INDEX idx_escalations_triggered
ON escalations(triggered_at);

CREATE INDEX idx_escalations_trigger_type
ON escalations(trigger_type);

CREATE INDEX idx_escalations_team
ON escalations(assigned_team_id);

CREATE INDEX idx_escalations_user
ON escalations(assigned_to);

CREATE INDEX idx_escalations_unresolved
ON escalations(resolved_at)
WHERE resolved_at IS NULL;


-- AI MODEL VERSIONS
CREATE INDEX idx_ai_model_versions_active
ON ai_model_versions(is_active);


-- AI PREDICTIONS
CREATE INDEX idx_predictions_ticket_time
ON predictions(ticket_id, prediction_timestamp);

CREATE INDEX idx_predictions_type_time
ON predictions(prediction_type, prediction_timestamp);

CREATE INDEX idx_predictions_decision
ON predictions(decision);

CREATE INDEX idx_predictions_sla_risk
ON predictions(prediction_type, prediction_timestamp)
WHERE prediction_type = 'SLA_RISK';


-- TICKET RELATIONS
CREATE INDEX idx_ticket_relations_ticket
ON ticket_relations(ticket_id);

CREATE INDEX idx_ticket_relations_related
ON ticket_relations(related_ticket_id);

CREATE INDEX idx_ticket_relations_type
ON ticket_relations(relation_type);


-- NOTIFICATIONS
CREATE INDEX idx_notifications_recipient
ON notifications(recipient_user_id);

CREATE INDEX idx_notifications_ticket
ON notifications(ticket_id);

CREATE INDEX idx_notifications_unread
ON notifications(recipient_user_id, is_read)
WHERE is_read = FALSE;


-- AUDIT LOGS
CREATE INDEX idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logs_actor
ON audit_logs(actor_user_id);

CREATE INDEX idx_audit_logs_action
ON audit_logs(action);

CREATE INDEX idx_audit_logs_created
ON audit_logs(created_at);


-- =========================================================
-- END OF FINAL HLP SCHEMA
-- Backend Compatible
-- Analytics Compatible
-- 25 ENTITIES
-- =========================================================