-- =========================================================
-- HLP — Campus Helpdesk & Maintenance Tickets
-- FINAL PostgreSQL DATABASE SCHEMA
-- Based strictly on FINAL ERD
-- 26 ENTITIES
-- =========================================================


-- =========================================================
-- 0. EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;


-- =========================================================
-- 0.1 ENUM TYPES
-- =========================================================

CREATE TYPE user_role AS ENUM (
    'REPORTER',
    'AGENT',
    'TECHNICIAN',
    'MANAGER',
    'AUDITOR'
);

CREATE TYPE account_status AS ENUM (
    'PENDING_APPROVAL',
    'ACTIVE',
    'REJECTED',
    'SUSPENDED',
    'DISABLED'
);

CREATE TYPE impact_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

CREATE TYPE urgency_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

CREATE TYPE priority_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

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

CREATE TYPE sla_status AS ENUM (
    'ON_TRACK',
    'AT_RISK',
    'BREACHED'
);

CREATE TYPE ticket_event_type AS ENUM (
    'TICKET_CREATED',
    'CATEGORY_CHANGED',
    'PRIORITY_CHANGED',
    'ASSIGNED',
    'REASSIGNED',
    'COMMENT_ADDED',
    'ATTACHMENT_ADDED',
    'WORK_LOG_ADDED',
    'STATUS_CHANGED',
    'ESCALATED',
    'SLA_RISK_DETECTED',
    'SLA_BREACHED',
    'AI_SUGGESTION_CREATED',
    'AI_SUGGESTION_ACCEPTED',
    'AI_SUGGESTION_OVERRIDDEN',
    'RESOLVED',
    'REOPENED',
    'CLOSED'
);

CREATE TYPE comment_visibility AS ENUM (
    'INTERNAL',
    'REPORTER_VISIBLE'
);

CREATE TYPE escalation_trigger_type AS ENUM (
    'SLA_RISK',
    'SLA_BREACH',
    'URGENT',
    'MANUAL'
);

CREATE TYPE prediction_type AS ENUM (
    'CATEGORY',
    'PRIORITY',
    'DUPLICATE',
    'SLA_RISK'
);

CREATE TYPE prediction_decision AS ENUM (
    'PENDING',
    'ACCEPTED',
    'OVERRIDDEN'
);

CREATE TYPE ticket_relation_type AS ENUM (
    'DUPLICATE_OF',
    'RELATED_TO'
);


-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email CITEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT,

    role user_role NULL,

    requested_role user_role NULL,

    account_status account_status NOT NULL,

    approved_by UUID NULL,
    approved_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by UUID NULL,
    updated_by UUID NULL,

    CONSTRAINT fk_users_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 2. SUPPORT TEAMS
-- =========================================================

CREATE TABLE support_teams (
    support_team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    team_name VARCHAR(150) UNIQUE,
    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by UUID,
    updated_by UUID,

    CONSTRAINT fk_support_teams_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_support_teams_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 3. USER TEAMS
-- =========================================================

CREATE TABLE user_teams (
    user_team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,
    support_team_id UUID NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_teams_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_user_teams_team
        FOREIGN KEY (support_team_id)
        REFERENCES support_teams(support_team_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_user_teams_user_team
        UNIQUE (user_id, support_team_id)
);

CREATE UNIQUE INDEX uq_user_teams_primary
ON user_teams(user_id)
WHERE is_primary = TRUE;


-- =========================================================
-- 4. TECHNICIAN PROFILES
-- =========================================================

CREATE TABLE technician_profiles (
    technician_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE,

    max_active_tickets INTEGER NOT NULL,

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

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

    category_name VARCHAR(150) UNIQUE,

    default_team_id UUID NULL,

    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by UUID,
    updated_by UUID,

    CONSTRAINT fk_categories_default_team
        FOREIGN KEY (default_team_id)
        REFERENCES support_teams(support_team_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_categories_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_categories_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 6. LOCATIONS
-- =========================================================

CREATE TABLE locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    building VARCHAR(150),
    room_code VARCHAR(100),

    floor INTEGER NULL,

    description TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_locations_building_room
        UNIQUE (building, room_code)
);


-- =========================================================
-- 7. ASSETS
-- =========================================================

CREATE TABLE assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    asset_tag VARCHAR(100) UNIQUE,

    name VARCHAR(150),

    status VARCHAR(100),

    location_id UUID NOT NULL,

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

    name VARCHAR(150) UNIQUE,

    timezone VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- 9. BUSINESS HOURS DAYS
-- =========================================================

CREATE TABLE business_hours_days (
    business_hours_day_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    business_hours_id UUID NOT NULL,

    day_of_week SMALLINT NOT NULL,

    is_working_day BOOLEAN NOT NULL DEFAULT TRUE,

    start_time TIME NULL,
    end_time TIME NULL,

    CONSTRAINT fk_business_hours_days_hours
        FOREIGN KEY (business_hours_id)
        REFERENCES business_hours(business_hours_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_business_hours_day
        UNIQUE (business_hours_id, day_of_week),

    CONSTRAINT chk_day_of_week
        CHECK (
            day_of_week BETWEEN 0 AND 6
        ),

    CONSTRAINT chk_business_hours_time
        CHECK (
            (
                start_time IS NULL
                AND end_time IS NULL
            )
            OR
            start_time < end_time
        )
);


-- =========================================================
-- 10. SLA PROFILES
-- =========================================================

CREATE TABLE sla_profiles (
    sla_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) UNIQUE,

    response_target_minutes INTEGER NOT NULL,

    resolution_target_minutes INTEGER NOT NULL,

    business_hours_id UUID NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by UUID,
    updated_by UUID,

    CONSTRAINT fk_sla_profiles_business_hours
        FOREIGN KEY (business_hours_id)
        REFERENCES business_hours(business_hours_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sla_profiles_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sla_profiles_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_sla_response_target
        CHECK (
            response_target_minutes > 0
        ),

    CONSTRAINT chk_sla_resolution_target
        CHECK (
            resolution_target_minutes > 0
        )
);


-- =========================================================
-- 11. PRIORITY MATRICES
-- =========================================================

CREATE TABLE priority_matrices (
    matrix_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    impact impact_level NOT NULL,

    urgency urgency_level NOT NULL,

    priority priority_level NOT NULL,

    sla_profile_id UUID NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_priority_matrices_sla
        FOREIGN KEY (sla_profile_id)
        REFERENCES sla_profiles(sla_profile_id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_priority_matrix_active
ON priority_matrices(impact, urgency)
WHERE is_active = TRUE;


-- =========================================================
-- 12. TICKETS
-- =========================================================

CREATE TABLE tickets (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reference_number VARCHAR(50) UNIQUE,

    reporter_id UUID NOT NULL,

    category_id UUID NOT NULL,

    location_id UUID NOT NULL,

    asset_id UUID NULL,

    sla_profile_id UUID NOT NULL,

    title VARCHAR(255),

    description TEXT,

    impact impact_level,

    urgency urgency_level,

    priority priority_level,

    status ticket_status NOT NULL DEFAULT 'NEW',

    assigned_at TIMESTAMPTZ NULL,

    first_response_at TIMESTAMPTZ NULL,

    resolved_at TIMESTAMPTZ NULL,

    closed_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by UUID,
    updated_by UUID,

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

    CONSTRAINT fk_tickets_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tickets_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 13. TICKET SLA EXECUTIONS
-- =========================================================

CREATE TABLE ticket_sla_executions (
    ticket_sla_execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    sla_profile_id UUID NOT NULL,

    response_target_minutes INTEGER NOT NULL,

    resolution_target_minutes INTEGER NOT NULL,

    business_hours_id UUID NOT NULL,

    response_due_at TIMESTAMPTZ NULL,

    resolution_due_at TIMESTAMPTZ NULL,

    resolution_sla_started_at TIMESTAMPTZ NULL,

    sla_status sla_status NOT NULL DEFAULT 'ON_TRACK',

    response_breached_at TIMESTAMPTZ NULL,

    resolution_breached_at TIMESTAMPTZ NULL,

    effective_from TIMESTAMPTZ NOT NULL,

    effective_to TIMESTAMPTZ NULL,

    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    reason TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_by UUID NULL,

    CONSTRAINT fk_ticket_sla_execution_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_sla_execution_profile
        FOREIGN KEY (sla_profile_id)
        REFERENCES sla_profiles(sla_profile_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ticket_sla_execution_business_hours
        FOREIGN KEY (business_hours_id)
        REFERENCES business_hours(business_hours_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ticket_sla_execution_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_sla_execution_response_target
        CHECK (
            response_target_minutes > 0
        ),

    CONSTRAINT chk_sla_execution_resolution_target
        CHECK (
            resolution_target_minutes > 0
        ),

    CONSTRAINT chk_sla_execution_current
        CHECK (
            (
                is_current = TRUE
                AND effective_to IS NULL
            )
            OR
            (
                is_current = FALSE
                AND effective_to IS NOT NULL
            )
        ),

    CONSTRAINT chk_sla_execution_effective_dates
        CHECK (
            effective_to IS NULL
            OR effective_from < effective_to
        )
);

CREATE UNIQUE INDEX uq_ticket_sla_execution_current
ON ticket_sla_executions(ticket_id)
WHERE is_current = TRUE;


-- =========================================================
-- 14. ASSIGNMENTS
-- =========================================================

CREATE TABLE assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    assigned_to UUID NOT NULL,

    assigned_team_id UUID NOT NULL,

    assigned_by UUID NOT NULL,

    assigned_at TIMESTAMPTZ NOT NULL,

    unassigned_at TIMESTAMPTZ NULL,

    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    reason TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

    CONSTRAINT chk_assignment_current
        CHECK (
            (
                is_current = TRUE
                AND unassigned_at IS NULL
            )
            OR
            (
                is_current = FALSE
                AND unassigned_at IS NOT NULL
            )
        ),

    CONSTRAINT chk_assignment_dates
        CHECK (
            unassigned_at IS NULL
            OR assigned_at < unassigned_at
        )
);

CREATE UNIQUE INDEX uq_current_ticket_assignment
ON assignments(ticket_id)
WHERE is_current = TRUE;


-- =========================================================
-- 15. STATUS HISTORIES
-- =========================================================

CREATE TABLE status_histories (
    status_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    changed_by UUID NOT NULL,

    old_status ticket_status,

    new_status ticket_status NOT NULL,

    reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_status_histories_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_status_histories_changed_by
        FOREIGN KEY (changed_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_status_change
        CHECK (
            old_status IS NULL
            OR old_status <> new_status
        )
);


-- =========================================================
-- 16. TICKET EVENTS
-- =========================================================

CREATE TABLE ticket_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    actor_id UUID NOT NULL,

    event_type ticket_event_type NOT NULL,

    description TEXT,

    old_value JSONB NULL,

    new_value JSONB NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ticket_events_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_events_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 17. COMMENTS
-- =========================================================

CREATE TABLE comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    author_id UUID NOT NULL,

    content TEXT,

    visibility comment_visibility NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comments_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comments_author
        FOREIGN KEY (author_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 18. ATTACHMENTS
-- =========================================================

CREATE TABLE attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    uploaded_by UUID NOT NULL,

    file_path TEXT,

    file_uuid UUID UNIQUE,

    original_name VARCHAR(255),

    file_type VARCHAR(150),

    file_size BIGINT,

    submitted_at TIMESTAMPTZ,

    visibility comment_visibility NOT NULL,

    CONSTRAINT fk_attachments_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attachments_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_attachment_file_size
        CHECK (
            file_size >= 0
        )
);


-- =========================================================
-- 19. WORK LOGS
-- =========================================================

CREATE TABLE work_logs (
    work_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    technician_id UUID NOT NULL,

    diagnosis TEXT,

    actions_taken TEXT,

    parts_used TEXT NULL,

    time_spent_minutes INTEGER,

    resolution_code VARCHAR(100) NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_work_logs_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_work_logs_technician
        FOREIGN KEY (technician_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_work_log_time
        CHECK (
            time_spent_minutes >= 0
        )
);


-- =========================================================
-- 20. FEEDBACK
-- =========================================================

CREATE TABLE feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    user_id UUID NOT NULL,

    rating SMALLINT NULL,

    confirmation_status VARCHAR(100),

    comment TEXT NULL,

    reopened_reason TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_feedback_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_feedback_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_feedback_ticket_user
        UNIQUE (ticket_id, user_id),

    CONSTRAINT chk_feedback_rating
        CHECK (
            rating IS NULL
            OR rating BETWEEN 1 AND 5
        )
);


-- =========================================================
-- 21. ESCALATIONS
-- =========================================================

CREATE TABLE escalations (
    escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    trigger_type escalation_trigger_type NOT NULL,

    reason TEXT,

    from_user_id UUID NULL,

    to_user_id UUID NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    resolved_at TIMESTAMPTZ NULL,

    status VARCHAR(100),

    CONSTRAINT fk_escalations_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_escalations_from_user
        FOREIGN KEY (from_user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_escalations_to_user
        FOREIGN KEY (to_user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 22. NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    recipient_user_id UUID NOT NULL,

    notification_type VARCHAR(100),

    title VARCHAR(255),

    message TEXT,

    ticket_id UUID NULL,

    related_user_id UUID NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    read_at TIMESTAMPTZ NULL,

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
                is_read = TRUE
                AND read_at IS NOT NULL
            )
            OR
            (
                is_read = FALSE
                AND read_at IS NULL
            )
        )
);


-- =========================================================
-- 23. AI MODEL VERSIONS
-- =========================================================

CREATE TABLE ai_model_versions (
    model_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    model_name VARCHAR(150),

    version VARCHAR(50),

    model_type VARCHAR(100),

    dataset_version VARCHAR(100),

    metric_name VARCHAR(100),

    metric_value NUMERIC,

    fallback_description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_ai_model_version
        UNIQUE (model_name, version)
);


-- =========================================================
-- 24. PREDICTIONS
-- =========================================================

CREATE TABLE predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    model_version_id UUID NOT NULL,

    prediction_type prediction_type NOT NULL,

    predicted_value TEXT,

    confidence NUMERIC,

    explanation TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    reviewed_by UUID NULL,

    reviewed_at TIMESTAMPTZ NULL,

    decision prediction_decision NOT NULL DEFAULT 'PENDING',

    override_value TEXT NULL,

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
            OR confidence BETWEEN 0 AND 1
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
        )
);


-- =========================================================
-- 25. TICKET RELATIONS
-- =========================================================

CREATE TABLE ticket_relations (
    ticket_relation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL,

    related_ticket_id UUID NOT NULL,

    relation_type ticket_relation_type NOT NULL,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ticket_relations_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_relations_related_ticket
        FOREIGN KEY (related_ticket_id)
        REFERENCES tickets(ticket_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_relations_created_by
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
-- 26. AUDIT LOGS
-- =========================================================

CREATE TABLE audit_logs (
    audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_id UUID NULL,

    action VARCHAR(100),

    entity_type VARCHAR(100),

    entity_id UUID,

    ip_address INET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- INDEXES
-- =========================================================


-- =========================================================
-- USERS
-- =========================================================

CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_users_account_status
ON users(account_status);


-- =========================================================
-- USER TEAMS
-- =========================================================

CREATE INDEX idx_user_teams_user
ON user_teams(user_id);

CREATE INDEX idx_user_teams_team
ON user_teams(support_team_id);


-- =========================================================
-- TECHNICIAN PROFILES
-- =========================================================

CREATE INDEX idx_technician_profiles_user
ON technician_profiles(user_id);

CREATE INDEX idx_technician_profiles_availability
ON technician_profiles(is_available);


-- =========================================================
-- SUPPORT TEAMS
-- =========================================================

CREATE INDEX idx_support_teams_created_by
ON support_teams(created_by);

CREATE INDEX idx_support_teams_updated_by
ON support_teams(updated_by);


-- =========================================================
-- CATEGORIES
-- =========================================================

CREATE INDEX idx_categories_default_team
ON categories(default_team_id);

CREATE INDEX idx_categories_created_by
ON categories(created_by);

CREATE INDEX idx_categories_updated_by
ON categories(updated_by);


-- =========================================================
-- LOCATIONS
-- =========================================================

CREATE INDEX idx_locations_building
ON locations(building);


-- =========================================================
-- ASSETS
-- =========================================================

CREATE INDEX idx_assets_location
ON assets(location_id);


-- =========================================================
-- BUSINESS HOURS
-- =========================================================

CREATE INDEX idx_business_hours_active
ON business_hours(is_active);


-- =========================================================
-- BUSINESS HOURS DAYS
-- =========================================================

CREATE INDEX idx_business_hours_days_business_hours
ON business_hours_days(business_hours_id);


-- =========================================================
-- SLA PROFILES
-- =========================================================

CREATE INDEX idx_sla_profiles_business_hours
ON sla_profiles(business_hours_id);

CREATE INDEX idx_sla_profiles_created_by
ON sla_profiles(created_by);

CREATE INDEX idx_sla_profiles_updated_by
ON sla_profiles(updated_by);


-- =========================================================
-- PRIORITY MATRICES
-- =========================================================

CREATE INDEX idx_priority_matrices_sla
ON priority_matrices(sla_profile_id);

CREATE INDEX idx_priority_matrices_active
ON priority_matrices(is_active);


-- =========================================================
-- TICKETS
-- =========================================================

CREATE INDEX idx_tickets_reference_number
ON tickets(reference_number);

CREATE INDEX idx_tickets_reporter
ON tickets(reporter_id);

CREATE INDEX idx_tickets_category
ON tickets(category_id);

CREATE INDEX idx_tickets_location
ON tickets(location_id);

CREATE INDEX idx_tickets_asset
ON tickets(asset_id);

CREATE INDEX idx_tickets_sla_profile
ON tickets(sla_profile_id);

CREATE INDEX idx_tickets_urgency
ON tickets(urgency);

CREATE INDEX idx_tickets_priority
ON tickets(priority);

CREATE INDEX idx_tickets_status
ON tickets(status);

CREATE INDEX idx_tickets_created_at
ON tickets(created_at);


-- =========================================================
-- TICKET SLA EXECUTIONS
-- =========================================================

CREATE INDEX idx_ticket_sla_executions_ticket
ON ticket_sla_executions(ticket_id);

CREATE INDEX idx_ticket_sla_executions_response_due
ON ticket_sla_executions(response_due_at);

CREATE INDEX idx_ticket_sla_executions_resolution_due
ON ticket_sla_executions(resolution_due_at);

CREATE INDEX idx_ticket_sla_executions_sla_status
ON ticket_sla_executions(sla_status);

CREATE INDEX idx_ticket_sla_executions_effective_from
ON ticket_sla_executions(effective_from);

CREATE INDEX idx_ticket_sla_executions_effective_to
ON ticket_sla_executions(effective_to);

CREATE INDEX idx_ticket_sla_executions_current
ON ticket_sla_executions(is_current);


-- =========================================================
-- ASSIGNMENTS
-- =========================================================

CREATE INDEX idx_assignments_ticket
ON assignments(ticket_id);

CREATE INDEX idx_assignments_assigned_to
ON assignments(assigned_to);

CREATE INDEX idx_assignments_team
ON assignments(assigned_team_id);

CREATE INDEX idx_assignments_assigned_at
ON assignments(assigned_at);

CREATE INDEX idx_assignments_unassigned_at
ON assignments(unassigned_at);

CREATE INDEX idx_assignments_current
ON assignments(is_current);

CREATE UNIQUE INDEX uq_assignments_current_ticket
ON assignments(ticket_id)
WHERE is_current = TRUE;


-- =========================================================
-- STATUS HISTORIES
-- =========================================================

CREATE INDEX idx_status_histories_ticket_created
ON status_histories(ticket_id, created_at);

CREATE INDEX idx_status_histories_changed_by
ON status_histories(changed_by);

CREATE INDEX idx_status_histories_new_status
ON status_histories(new_status);


-- =========================================================
-- TICKET EVENTS
-- =========================================================

CREATE INDEX idx_ticket_events_ticket_created
ON ticket_events(ticket_id, created_at);

CREATE INDEX idx_ticket_events_actor
ON ticket_events(actor_id);

CREATE INDEX idx_ticket_events_type
ON ticket_events(event_type);


-- =========================================================
-- COMMENTS
-- =========================================================

CREATE INDEX idx_comments_ticket_created
ON comments(ticket_id, created_at);

CREATE INDEX idx_comments_author
ON comments(author_id);


-- =========================================================
-- ATTACHMENTS
-- =========================================================

CREATE INDEX idx_attachments_ticket
ON attachments(ticket_id);

CREATE INDEX idx_attachments_uploaded_by
ON attachments(uploaded_by);


-- =========================================================
-- WORK LOGS
-- =========================================================

CREATE INDEX idx_work_logs_ticket
ON work_logs(ticket_id);

CREATE INDEX idx_work_logs_technician
ON work_logs(technician_id);

CREATE INDEX idx_work_logs_created_at
ON work_logs(created_at);


-- =========================================================
-- FEEDBACK
-- =========================================================

CREATE INDEX idx_feedback_ticket
ON feedback(ticket_id);

CREATE INDEX idx_feedback_user
ON feedback(user_id);

CREATE INDEX idx_feedback_rating
ON feedback(rating);


-- =========================================================
-- ESCALATIONS
-- =========================================================

CREATE INDEX idx_escalations_ticket
ON escalations(ticket_id);

CREATE INDEX idx_escalations_trigger_type
ON escalations(trigger_type);

CREATE INDEX idx_escalations_from_user
ON escalations(from_user_id);

CREATE INDEX idx_escalations_to_user
ON escalations(to_user_id);

CREATE INDEX idx_escalations_created_at
ON escalations(created_at);


-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE INDEX idx_notifications_recipient
ON notifications(recipient_user_id);

CREATE INDEX idx_notifications_ticket
ON notifications(ticket_id);

CREATE INDEX idx_notifications_related_user
ON notifications(related_user_id);

CREATE INDEX idx_notifications_unread
ON notifications(recipient_user_id, is_read)
WHERE is_read = FALSE;


-- =========================================================
-- AI MODEL VERSIONS
-- =========================================================

CREATE INDEX idx_ai_model_versions_model
ON ai_model_versions(model_name);

CREATE INDEX idx_ai_model_versions_created_at
ON ai_model_versions(created_at);


-- =========================================================
-- PREDICTIONS
-- =========================================================

CREATE INDEX idx_predictions_ticket_created
ON predictions(ticket_id, created_at);

CREATE INDEX idx_predictions_type_created
ON predictions(prediction_type, created_at);

CREATE INDEX idx_predictions_model
ON predictions(model_version_id);

CREATE INDEX idx_predictions_reviewed_by
ON predictions(reviewed_by);


-- =========================================================
-- TICKET RELATIONS
-- =========================================================

CREATE INDEX idx_ticket_relations_ticket
ON ticket_relations(ticket_id);

CREATE INDEX idx_ticket_relations_related_ticket
ON ticket_relations(related_ticket_id);

CREATE INDEX idx_ticket_relations_type
ON ticket_relations(relation_type);


-- =========================================================
-- AUDIT LOGS
-- =========================================================

CREATE INDEX idx_audit_logs_actor
ON audit_logs(actor_id);

CREATE INDEX idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logs_created_at
ON audit_logs(created_at);

CREATE INDEX idx_audit_logs_action
ON audit_logs(action);


-- =========================================================
-- END OF FINAL HLP DATABASE SCHEMA
-- 26 ENTITIES
-- Based on FINAL ERD
-- =========================================================