-- =========================================================
-- HLP — Campus Helpdesk
-- DEVELOPMENT / TEST SEED
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- =========================================================
-- FIXED UUIDS
-- =========================================================

-- USERS
-- reporter
-- 00000000-0000-0000-0000-000000000001

-- agent
-- 00000000-0000-0000-0000-000000000002

-- technician
-- 00000000-0000-0000-0000-000000000003

-- manager
-- 00000000-0000-0000-0000-000000000004

-- auditor
-- 00000000-0000-0000-0000-000000000005

-- TEAMS
-- 10000000-0000-0000-0000-000000000001 IT
-- 10000000-0000-0000-0000-000000000002 Network
-- 10000000-0000-0000-0000-000000000003 Facilities

-- LOCATIONS
-- 20000000-0000-0000-0000-000000000001
-- 20000000-0000-0000-0000-000000000002
-- 20000000-0000-0000-0000-000000000003

-- BUSINESS HOURS
-- 30000000-0000-0000-0000-000000000001

-- CATEGORIES
-- 40000000-0000-0000-0000-000000000001 IT
-- 40000000-0000-0000-0000-000000000002 Network
-- 40000000-0000-0000-0000-000000000003 Facilities

-- SLA
-- 50000000-0000-0000-0000-000000000001
-- 50000000-0000-0000-0000-000000000002
-- 50000000-0000-0000-0000-000000000003

-- ASSETS
-- 60000000-0000-0000-0000-000000000001
-- 60000000-0000-0000-0000-000000000002

-- TICKETS
-- 70000000-0000-0000-0000-000000000001 ... 005

-- =========================================================
-- USERS
-- =========================================================

INSERT INTO users (
    user_id,
    email,
    password_hash,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'student@bua.edu.eg',
    crypt('Dev12345!', gen_salt('bf', 12)),
    'Demo Student',
    'REPORTER',
    TRUE,
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0000-000000000002',
    'agent@bua.edu.eg',
    crypt('Dev12345!', gen_salt('bf', 12)),
    'Demo Agent',
    'AGENT',
    TRUE,
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0000-000000000003',
    'technician@bua.edu.eg',
    crypt('Dev12345!', gen_salt('bf', 12)),
    'Demo Technician',
    'TECHNICIAN',
    TRUE,
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0000-000000000004',
    'manager@bua.edu.eg',
    crypt('Dev12345!', gen_salt('bf', 12)),
    'Demo Manager',
    'MANAGER',
    TRUE,
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0000-000000000005',
    'auditor@bua.edu.eg',
    crypt('Dev12345!', gen_salt('bf', 12)),
    'Demo Auditor',
    'AUDITOR',
    TRUE,
    NOW(),
    NOW()
);

-- =========================================================
-- SUPPORT TEAMS
-- =========================================================

INSERT INTO support_teams (
    support_team_id,
    team_name,
    description,
    is_active
)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'IT Support',
    'Hardware, software and classroom IT support',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000002',
    'Network Support',
    'Campus network and connectivity support',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000003',
    'Facilities',
    'Facilities and maintenance support',
    TRUE
);

-- =========================================================
-- USER TEAMS
-- =========================================================

INSERT INTO user_teams (
    user_id,
    support_team_id,
    is_primary
)
VALUES
(
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    TRUE
);

-- =========================================================
-- TECHNICIAN PROFILE
-- =========================================================

INSERT INTO technician_profiles (
    user_id,
    max_active_tickets,
    skills
)
VALUES
(
    '00000000-0000-0000-0000-000000000003',
    5,
    'Windows, Hardware, Networking, Printers'
);

-- =========================================================
-- LOCATIONS
-- =========================================================

INSERT INTO locations (
    location_id,
    building,
    floor,
    room_code,
    description
)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'AI Building',
    'Ground',
    'G101',
    'Artificial Intelligence Lab'
),
(
    '20000000-0000-0000-0000-000000000002',
    'Main Building',
    'First',
    '101',
    'Computer Laboratory'
),
(
    '20000000-0000-0000-0000-000000000003',
    'Engineering Building',
    'Second',
    '201',
    'Lecture Room'
);

-- =========================================================
-- BUSINESS HOURS
-- =========================================================

INSERT INTO business_hours (
    business_hours_id,
    name,
    timezone,
    is_active
)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'BUA Standard Working Hours',
    'Africa/Cairo',
    TRUE
);

INSERT INTO business_hours_days (
    business_hours_id,
    day_of_week,
    start_time,
    end_time,
    is_working_day
)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    0,
    '08:00',
    '16:00',
    TRUE
),
(
    '30000000-0000-0000-0000-000000000001',
    1,
    '08:00',
    '16:00',
    TRUE
),
(
    '30000000-0000-0000-0000-000000000001',
    2,
    '08:00',
    '16:00',
    TRUE
),
(
    '30000000-0000-0000-0000-000000000001',
    3,
    '08:00',
    '16:00',
    TRUE
),
(
    '30000000-0000-0000-0000-000000000001',
    4,
    '08:00',
    '16:00',
    TRUE
),
(
    '30000000-0000-0000-0000-000000000001',
    5,
    NULL,
    NULL,
    FALSE
),
(
    '30000000-0000-0000-0000-000000000001',
    6,
    NULL,
    NULL,
    FALSE
);

-- =========================================================
-- SLA PROFILES
-- =========================================================

INSERT INTO sla_profiles (
    sla_profile_id,
    name,
    response_target_minutes,
    resolution_target_minutes,
    business_hours_id,
    is_active
)
VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'Critical SLA',
    30,
    240,
    '30000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '50000000-0000-0000-0000-000000000002',
    'High SLA',
    60,
    480,
    '30000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '50000000-0000-0000-0000-000000000003',
    'Standard SLA',
    240,
    1440,
    '30000000-0000-0000-0000-000000000001',
    TRUE
);

-- =========================================================
-- PRIORITY MATRIX
-- =========================================================

INSERT INTO priority_matrices (
    priority_matrix_id,
    impact,
    urgency,
    priority,
    sla_profile_id,
    is_active
)
VALUES
(
    '80000000-0000-0000-0000-000000000001',
    'HIGH',
    'HIGH',
    'CRITICAL',
    '50000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '80000000-0000-0000-0000-000000000002',
    'HIGH',
    'MEDIUM',
    'HIGH',
    '50000000-0000-0000-0000-000000000002',
    TRUE
),
(
    '80000000-0000-0000-0000-000000000003',
    'MEDIUM',
    'MEDIUM',
    'MEDIUM',
    '50000000-0000-0000-0000-000000000003',
    TRUE
),
(
    '80000000-0000-0000-0000-000000000004',
    'LOW',
    'LOW',
    'LOW',
    '50000000-0000-0000-0000-000000000003',
    TRUE
);

-- =========================================================
-- CATEGORIES
-- =========================================================

INSERT INTO categories (
    category_id,
    category_name,
    description,
    default_team_id,
    is_active
)
VALUES
(
    '40000000-0000-0000-0000-000000000001',
    'IT Support',
    'Computer, software and hardware issues',
    '10000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '40000000-0000-0000-0000-000000000002',
    'Network',
    'Internet and network connectivity issues',
    '10000000-0000-0000-0000-000000000002',
    TRUE
),
(
    '40000000-0000-0000-0000-000000000003',
    'Facilities',
    'Building and maintenance requests',
    '10000000-0000-0000-0000-000000000003',
    TRUE
);

-- =========================================================
-- ASSETS
-- =========================================================

INSERT INTO assets (
    asset_id,
    asset_tag,
    asset_type,
    asset_name,
    location_id,
    description,
    is_active
)
VALUES
(
    '60000000-0000-0000-0000-000000000001',
    'BUA-PC-001',
    'Computer',
    'Lab Computer 001',
    '20000000-0000-0000-0000-000000000002',
    'Desktop computer in computer laboratory',
    TRUE
),
(
    '60000000-0000-0000-0000-000000000002',
    'BUA-NET-001',
    'Network Device',
    'Main Network Switch',
    '20000000-0000-0000-0000-000000000001',
    'Main network switch',
    TRUE
);

-- =========================================================
-- TICKETS
-- =========================================================

INSERT INTO tickets (
    ticket_id,
    reference_number,
    reporter_id,
    category_id,
    location_id,
    asset_id,
    sla_profile_id,
    title,
    description,
    impact,
    urgency,
    priority,
    status,
    response_due_at,
    resolution_due_at
)
VALUES
(
    '70000000-0000-0000-0000-000000000001',
    'HLP-000001',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    'Computer does not start',
    'The laboratory computer does not power on.',
    'HIGH',
    'HIGH',
    'CRITICAL',
    'ASSIGNED',
    NOW() + INTERVAL '30 minutes',
    NOW() + INTERVAL '4 hours'
),
(
    '70000000-0000-0000-0000-000000000002',
    'HLP-000002',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'Network connection unavailable',
    'No internet connection is available in the lab.',
    'HIGH',
    'HIGH',
    'CRITICAL',
    'IN_PROGRESS',
    NOW() + INTERVAL '30 minutes',
    NOW() + INTERVAL '4 hours'
),
(
    '70000000-0000-0000-0000-000000000003',
    'HLP-000003',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    NULL,
    '50000000-0000-0000-0000-000000000003',
    'Software installation request',
    'Requesting installation of required development software.',
    'MEDIUM',
    'MEDIUM',
    'MEDIUM',
    'OPEN',
    NOW() + INTERVAL '4 hours',
    NOW() + INTERVAL '24 hours'
),
(
    '70000000-0000-0000-0000-000000000004',
    'HLP-000004',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    NULL,
    '50000000-0000-0000-0000-000000000003',
    'Air conditioner maintenance',
    'The air conditioner is not cooling properly.',
    'MEDIUM',
    'MEDIUM',
    'MEDIUM',
    'OPEN',
    NOW() + INTERVAL '4 hours',
    NOW() + INTERVAL '24 hours'
),
(
    '70000000-0000-0000-0000-000000000005',
    'HLP-000005',
    '00000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'Critical network outage',
    'Entire laboratory network is unavailable.',
    'HIGH',
    'HIGH',
    'CRITICAL',
    'ESCALATED',
    NOW() + INTERVAL '30 minutes',
    NOW() + INTERVAL '4 hours'
);

-- =========================================================
-- ASSIGNMENTS
-- =========================================================

INSERT INTO assignments (
    assignment_id,
    ticket_id,
    assigned_to,
    assigned_team_id,
    assigned_at,
    is_current,
    assigned_by,
    reason
)
VALUES
(
    '90000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    NOW(),
    TRUE,
    '00000000-0000-0000-0000-000000000002',
    'Assigned by support agent'
),
(
    '90000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    NOW(),
    TRUE,
    '00000000-0000-0000-0000-000000000002',
    'Network incident assignment'
),
(
    '90000000-0000-0000-0000-000000000003',
    '70000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    NOW(),
    TRUE,
    '00000000-0000-0000-0000-000000000002',
    'Critical outage escalation'
);

-- =========================================================
-- STATUS HISTORY
-- =========================================================

INSERT INTO status_histories (
    ticket_id,
    old_status,
    new_status,
    changed_by,
    reason
)
VALUES
(
    '70000000-0000-0000-0000-000000000001',
    NULL,
    'OPEN',
    '00000000-0000-0000-0000-000000000001',
    'Ticket created'
),
(
    '70000000-0000-0000-0000-000000000001',
    'OPEN',
    'ASSIGNED',
    '00000000-0000-0000-0000-000000000002',
    'Assigned to technician'
),
(
    '70000000-0000-0000-0000-000000000002',
    NULL,
    'OPEN',
    '00000000-0000-0000-0000-000000000001',
    'Ticket created'
),
(
    '70000000-0000-0000-0000-000000000002',
    'OPEN',
    'IN_PROGRESS',
    '00000000-0000-0000-0000-000000000003',
    'Technician started work'
),
(
    '70000000-0000-0000-0000-000000000005',
    NULL,
    'OPEN',
    '00000000-0000-0000-0000-000000000001',
    'Ticket created'
),
(
    '70000000-0000-0000-0000-000000000005',
    'OPEN',
    'ESCALATED',
    '00000000-0000-0000-0000-000000000002',
    'Critical network outage'
);

-- =========================================================
-- TICKET EVENTS
-- =========================================================

INSERT INTO ticket_events (
    ticket_id,
    event_type,
    actor_user_id,
    event_data
)
VALUES
(
    '70000000-0000-0000-0000-000000000001',
    'TICKET_CREATED',
    '00000000-0000-0000-0000-000000000001',
    '{"source":"PORTAL"}'
),
(
    '70000000-0000-0000-0000-000000000001',
    'TICKET_ASSIGNED',
    '00000000-0000-0000-0000-000000000002',
    '{"assigned_to":"00000000-0000-0000-0000-000000000003"}'
),
(
    '70000000-0000-0000-0000-000000000002',
    'TICKET_CREATED',
    '00000000-0000-0000-0000-000000000001',
    '{"source":"PORTAL"}'
),
(
    '70000000-0000-0000-0000-000000000002',
    'STATUS_CHANGED',
    '00000000-0000-0000-0000-000000000003',
    '{"from":"OPEN","to":"IN_PROGRESS"}'
),
(
    '70000000-0000-0000-0000-000000000005',
    'TICKET_ESCALATED',
    '00000000-0000-0000-0000-000000000002',
    '{"reason":"Critical network outage"}'
);

-- =========================================================
-- COMMENTS
-- =========================================================

INSERT INTO comments (
    ticket_id,
    user_id,
    body,
    is_internal
)
VALUES
(
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'Checked the power connection and started hardware diagnostics.',
    TRUE
),
(
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'Technician has started investigating the issue.',
    FALSE
),
(
    '70000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    'Network switch connectivity is being checked.',
    TRUE
);

-- =========================================================
-- WORK LOGS
-- =========================================================

INSERT INTO work_logs (
    ticket_id,
    user_id,
    started_at,
    ended_at,
    time_spent_minutes,
    note
)
VALUES
(
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    NOW() - INTERVAL '30 minutes',
    NOW(),
    30,
    'Initial hardware diagnostics'
),
(
    '70000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    NOW() - INTERVAL '45 minutes',
    NOW(),
    45,
    'Network connectivity diagnostics'
);

-- =========================================================
-- AI MODEL
-- =========================================================

INSERT INTO ai_model_versions (
    model_version_id,
    model_name,
    version,
    model_type,
    training_dataset_version,
    feature_schema_version,
    trained_at,
    deployed_at,
    metrics,
    is_active
)
VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'helpdesk-rule-baseline',
    '1.0',
    'RULE_BASED',
    'seed-v1',
    'features-v1',
    NOW(),
    NOW(),
    '{"accuracy":0.85,"macro_f1":0.82}',
    TRUE
);

-- =========================================================
-- PREDICTIONS
-- =========================================================

INSERT INTO predictions (
    prediction_id,
    ticket_id,
    model_version_id,
    prediction_type,
    predicted_value,
    confidence,
    decision,
    reviewed_by,
    reviewed_at
)
VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'CATEGORY',
    'IT Support',
    0.9300,
    'PENDING',
    NULL,
    NULL
),
(
    'b0000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'CATEGORY',
    'Network',
    0.9700,
    'ACCEPTED',
    '00000000-0000-0000-0000-000000000002',
    NOW()
);

-- =========================================================
-- ESCALATIONS
-- =========================================================

INSERT INTO escalations (
    escalation_id,
    ticket_id,
    trigger_type,
    severity,
    triggered_at,
    assigned_to,
    assigned_team_id,
    reason
)
VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000005',
    'SLA_BREACH',
    'CRITICAL',
    NOW(),
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    'Critical network outage'
);

-- =========================================================
-- TICKET RELATION
-- =========================================================

INSERT INTO ticket_relations (
    ticket_relation_id,
    ticket_id,
    related_ticket_id,
    relation_type,
    created_by
)
VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000005',
    '70000000-0000-0000-0000-000000000002',
    'RELATED',
    '00000000-0000-0000-0000-000000000002'
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

INSERT INTO notifications (
    notification_id,
    recipient_user_id,
    ticket_id,
    related_user_id,
    notification_type,
    title,
    body,
    is_read
)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'TICKET_ASSIGNED',
    'Ticket Assigned',
    'Your ticket has been assigned to a technician.',
    FALSE
),
(
    'e0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000005',
    NULL,
    'TICKET_ESCALATED',
    'Critical Ticket Escalated',
    'A critical network ticket requires attention.',
    FALSE
);

-- =========================================================
-- FEEDBACK
-- =========================================================

INSERT INTO feedback (
    feedback_id,
    ticket_id,
    user_id,
    rating,
    comment
)
VALUES
(
    'f0000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    5,
    'Demo feedback record'
);

-- =========================================================
-- AUDIT LOG
-- =========================================================

INSERT INTO audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values
)
VALUES
(
    '00000000-0000-0000-0000-000000000002',
    'TICKET',
    '70000000-0000-0000-0000-000000000001',
    'ASSIGN',
    '{"status":"OPEN"}',
    '{"status":"ASSIGNED","assigned_to":"00000000-0000-0000-0000-000000000003"}'
),
(
    '00000000-0000-0000-0000-000000000002',
    'TICKET',
    '70000000-0000-0000-0000-000000000005',
    'ESCALATE',
    '{"status":"OPEN"}',
    '{"status":"ESCALATED"}'
);

COMMIT;

-- =========================================================
-- END OF SEED
-- =========================================================