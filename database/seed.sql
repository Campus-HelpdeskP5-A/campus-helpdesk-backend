-- =========================================================
-- HLP — Campus Helpdesk & Maintenance
-- FINAL SEED DATA
-- PostgreSQL
--
-- 36 TICKETS ONLY
-- Designed for:
--   - AI priority prediction
--   - Duplicate detection
--   - SLA risk prediction
--
-- =========================================================


BEGIN;


-- =========================================================
-- 0. CLEAN EXISTING DATA
-- =========================================================

TRUNCATE TABLE
    audit_logs,
    ticket_relations,
    predictions,
    ai_model_versions,
    notifications,
    escalations,
    feedback,
    work_logs,
    attachments,
    comments,
    ticket_events,
    status_histories,
    assignments,
    ticket_sla_executions,
    tickets,
    priority_matrices,
    sla_profiles,
    business_hours_days,
    business_hours,
    assets,
    locations,
    categories,
    technician_profiles,
    user_teams,
    support_teams,
    users
RESTART IDENTITY CASCADE;


-- =========================================================
-- 1. USERS
-- =========================================================

INSERT INTO users (
    user_id,
    email,
    password_hash,
    full_name,
    role,
    requested_role,
    account_status,
    approved_by,
    approved_at,
    created_at,
    updated_at
)
VALUES

-- REPORTERS
(
    '00000000-0000-0000-0000-000000000001',
    'ahmed.student@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Ahmed Hassan',
    'REPORTER',
    'REPORTER',
    'ACTIVE',
    NULL,
    NULL,
    '2026-08-01 09:00:00+03',
    '2026-08-01 09:00:00+03'
),

(
    '00000000-0000-0000-0000-000000000002',
    'mariam.student@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Mariam Ali',
    'REPORTER',
    'REPORTER',
    'ACTIVE',
    NULL,
    NULL,
    '2026-08-02 09:00:00+03',
    '2026-08-02 09:00:00+03'
),

(
    '00000000-0000-0000-0000-000000000003',
    'Omar Mahmoud',
    'REPORTER',
    'REPORTER',
    'ACTIVE',
    NULL,
    NULL,
    '2026-08-03 09:00:00+03',

-- AGENT
(
    '00000000-0000-0000-0000-000000000004',
    'agent1@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Sara Agent',
    'AGENT',
    'AGENT',
    '2026-07-20 09:00:00+03',
    '2026-07-20 09:00:00+03'
),

-- TECHNICIANS
(
    '00000000-0000-0000-0000-000000000005',
    'tech.electrical@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Karim Electrical',
    'TECHNICIAN',
    'TECHNICIAN',
    'ACTIVE',
    NULL,
    NULL,
    '2026-07-20 09:00:00+03',
    '2026-07-20 09:00:00+03'
),

(
    '00000000-0000-0000-0000-000000000006',
    'tech.network@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Youssef Network',
    'TECHNICIAN',
    'TECHNICIAN',
    'ACTIVE',
    NULL,
    NULL,
    '2026-07-20 09:00:00+03',
    '2026-07-20 09:00:00+03'
),

(
    '00000000-0000-0000-0000-000000000007',
    'tech.facilities@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Nour Facilities',
    'TECHNICIAN',
    'TECHNICIAN',
    'ACTIVE',
    NULL,
    NULL,
    '2026-07-20 09:00:00+03',
    '2026-07-20 09:00:00+03'
),

-- MANAGER
(
    '00000000-0000-0000-0000-000000000008',
    'manager@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Hany Manager',
    'MANAGER',
    'MANAGER',
    'ACTIVE',
    NULL,
    NULL,
    '2026-07-15 09:00:00+03',
    '2026-07-15 09:00:00+03'
),

-- AUDITOR
(
    '00000000-0000-0000-0000-000000000009',
    'auditor@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Dina Auditor',
    'AUDITOR',
    'AUDITOR',
    'ACTIVE',
    NULL,
    NULL,
    '2026-07-15 09:00:00+03',
    '2026-07-15 09:00:00+03'
),

-- PENDING
(
    '00000000-0000-0000-0000-000000000010',
    'pending@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Pending User',
    NULL,
    'AGENT',
    'PENDING_APPROVAL',
    NULL,
    NULL,
    '2026-09-01 09:00:00+03',
    '2026-09-01 09:00:00+03'
),

-- REJECTED
(
    '00000000-0000-0000-0000-000000000011',
    'rejected@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Rejected User',
    NULL,
    'TECHNICIAN',
    'REJECTED',
    NULL,
    NULL,
    '2026-09-02 09:00:00+03',
    '2026-09-02 09:00:00+03'
),

-- SUSPENDED
(
    '00000000-0000-0000-0000-000000000012',
    'suspended@university.edu',
    crypt('Password123!', gen_salt('bf')),
    'Suspended User',
    'REPORTER',
    'REPORTER',
    'SUSPENDED',
    NULL,
    NULL,
    '2026-08-10 09:00:00+03',
    '2026-09-10 09:00:00+03'
),

-- DISABLED
(
    '00000000-0000-0000-0000-000000000013',
    'disabled@university.edu',
    'disabled_hash',
    'Disabled User',
    'REPORTER',
    'REPORTER',
    'DISABLED',
    NULL,
    NULL,
    '2026-08-11 09:00:00+03',
    '2026-09-10 09:00:00+03'
);


-- =========================================================
-- 2. SUPPORT TEAMS
-- =========================================================

INSERT INTO support_teams (
    support_team_id,
    team_name,
    description,
    is_active,
    created_by,
    updated_by
)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'IT Support',
    'Network, software, computers and account support',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '10000000-0000-0000-0000-000000000002',
    'Electrical Maintenance',
    'Electrical equipment and power maintenance',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '10000000-0000-0000-0000-000000000003',
    'Facilities Maintenance',
    'Building, water, AC and physical facilities',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '10000000-0000-0000-0000-000000000004',
    'Security Systems',
    'Cameras, access control and security systems',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
);


-- =========================================================
-- 3. USER TEAMS
-- =========================================================

INSERT INTO user_teams (
    user_team_id,
    user_id,
    support_team_id,
    is_primary
)
VALUES
(
    '11000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '11000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    TRUE
),
(
    '11000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '11000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000003',
    TRUE
),
(
    '11000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '11000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000003',
    FALSE
);


-- =========================================================
-- 4. TECHNICIAN PROFILES
-- =========================================================

INSERT INTO technician_profiles (
    technician_profile_id,
    user_id,
    max_active_tickets,
    is_available
)
VALUES
(
    '12000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000005',
    8,
    TRUE
),
(
    '12000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000006',
    10,
    TRUE
),
(
    '12000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000007',
    6,
    FALSE
);


-- =========================================================
-- 5. CATEGORIES
-- =========================================================

INSERT INTO categories (
    category_id,
    category_name,
    default_team_id,
    description,
    is_active,
    created_by,
    updated_by
)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'Network',
    '10000000-0000-0000-0000-000000000001',
    'Wi-Fi, internet and network connectivity issues',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '20000000-0000-0000-0000-000000000002',
    'Hardware',
    '10000000-0000-0000-0000-000000000001',
    'Computers, monitors, printers and hardware',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '20000000-0000-0000-0000-000000000003',
    'Software',
    '10000000-0000-0000-0000-000000000001',
    'Operating system and application problems',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '20000000-0000-0000-0000-000000000004',
    'Electrical',
    '10000000-0000-0000-0000-000000000002',
    'Power, electricity and electrical equipment',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '20000000-0000-0000-0000-000000000005',
    'Facilities',
    '10000000-0000-0000-0000-000000000003',
    'Air conditioning, water and building maintenance',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '20000000-0000-0000-0000-000000000006',
    'Security',
    '10000000-0000-0000-0000-000000000004',
    'Cameras and access control systems',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
);


-- =========================================================
-- 6. LOCATIONS
-- =========================================================

INSERT INTO locations (
    location_id,
    building,
    room_code,
    floor,
    description
)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'Engineering Building',
    'LAB-101',
    1,
    'Computer laboratory'
),
(
    '30000000-0000-0000-0000-000000000002',
    'Engineering Building',
    'LAB-202',
    2,
    'Networking laboratory'
),
(
    '30000000-0000-0000-0000-000000000003',
    'Administration Building',
    'OFF-105',
    1,
    'Administrative office'
),
(
    '30000000-0000-0000-0000-000000000004',
    'Library',
    'LIB-201',
    2,
    'Main library area'
),
(
    '30000000-0000-0000-0000-000000000005',
    'Science Building',
    'SCI-110',
    1,
    'Science classroom'
),
(
    '30000000-0000-0000-0000-000000000006',
    'Student Center',
    'STU-301',
    3,
    'Student activity room'
);


-- =========================================================
-- 7. ASSETS
-- =========================================================

INSERT INTO assets (
    asset_id,
    asset_tag,
    name,
    status,
    location_id
)
VALUES
(
    '40000000-0000-0000-0000-000000000001',
    'PC-LAB101-01',
    'Dell OptiPlex Desktop',
    'ACTIVE',
    '30000000-0000-0000-0000-000000000001'
),
(
    '40000000-0000-0000-0000-000000000002',
    'SW-LAB202-01',
    'Cisco Network Switch',
    'ACTIVE',
    '30000000-0000-0000-0000-000000000002'
),
(
    '40000000-0000-0000-0000-000000000003',
    'PR-OFF105-01',
    'HP Laser Printer',
    'ACTIVE',
    '30000000-0000-0000-0000-000000000003'
),
(
    '40000000-0000-0000-0000-000000000004',
    'CAM-STU301-01',
    'Security Camera',
    'ACTIVE',
    '30000000-0000-0000-0000-000000000006'
),
(
    '40000000-0000-0000-0000-000000000005',
    'AC-SCI110-01',
    'Air Conditioner',
    'MAINTENANCE',
    '30000000-0000-0000-0000-000000000005'
);


-- =========================================================
-- 8. BUSINESS HOURS
-- =========================================================

INSERT INTO business_hours (
    business_hours_id,
    name,
    timezone,
    is_active
)
VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'University Working Hours',
    'Africa/Cairo',
    TRUE
);


-- =========================================================
-- 9. BUSINESS HOURS DAYS
-- =========================================================

INSERT INTO business_hours_days (
    business_hours_day_id,
    business_hours_id,
    day_of_week,
    is_working_day,
    start_time,
    end_time
)
VALUES
(
    '51000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    0,
    TRUE,
    '09:00',
    '17:00'
),
(
    '51000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    1,
    TRUE,
    '09:00',
    '17:00'
),
(
    '51000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000001',
    2,
    TRUE,
    '09:00',
    '17:00'
),
(
    '51000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000001',
    3,
    TRUE,
    '09:00',
    '17:00'
),
(
    '51000000-0000-0000-0000-000000000005',
    '50000000-0000-0000-0000-000000000001',
    4,
    TRUE,
    '09:00',
    '17:00'
),
(
    '51000000-0000-0000-0000-000000000006',
    '50000000-0000-0000-0000-000000000001',
    5,
    TRUE,
    '10:00',
    '14:00'
),
(
    '51000000-0000-0000-0000-000000000007',
    '50000000-0000-0000-0000-000000000001',
    6,
    FALSE,
    NULL,
    NULL
);


-- =========================================================
-- 10. SLA PROFILES
-- =========================================================

INSERT INTO sla_profiles (
    sla_profile_id,
    name,
    response_target_minutes,
    resolution_target_minutes,
    business_hours_id,
    is_active,
    created_by,
    updated_by
)
VALUES
(
    '60000000-0000-0000-0000-000000000001',
    'Standard SLA',
    120,
    1440,
    '50000000-0000-0000-0000-000000000001',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '60000000-0000-0000-0000-000000000002',
    'Priority SLA',
    60,
    480,
    '50000000-0000-0000-0000-000000000001',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
),
(
    '60000000-0000-0000-0000-000000000003',
    'Critical SLA',
    15,
    120,
    '50000000-0000-0000-0000-000000000001',
    TRUE,
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008'
);


-- =========================================================
-- 11. PRIORITY MATRICES
-- =========================================================

INSERT INTO priority_matrices (
    priority_matrix_id,
    impact,
    urgency,
    priority,
    sla_profile_id
)
VALUES
(
    '61000000-0000-0000-0000-000000000001',
    'LOW',
    'LOW',
    'LOW',
    '60000000-0000-0000-0000-000000000001'
),
(
    '61000000-0000-0000-0000-000000000002',
    'LOW',
    'MEDIUM',
    'LOW',
    '60000000-0000-0000-0000-000000000001'
),
(
    '61000000-0000-0000-0000-000000000003',
    'LOW',
    'HIGH',
    'MEDIUM',
    '60000000-0000-0000-0000-000000000002'
),
(
    '61000000-0000-0000-0000-000000000004',
    'MEDIUM',
    'LOW',
    'LOW',
    '60000000-0000-0000-0000-000000000001'
),
(
    '61000000-0000-0000-0000-000000000005',
    'MEDIUM',
    'MEDIUM',
    'MEDIUM',
    '60000000-0000-0000-0000-000000000002'
),
(
    '61000000-0000-0000-0000-000000000006',
    'MEDIUM',
    'HIGH',
    'HIGH',
    '60000000-0000-0000-0000-000000000003'
),
(
    '61000000-0000-0000-0000-000000000007',
    'HIGH',
    'LOW',
    'MEDIUM',
    '60000000-0000-0000-0000-000000000002'
),
(
    '61000000-0000-0000-0000-000000000008',
    'HIGH',
    'MEDIUM',
    'HIGH',
    '60000000-0000-0000-0000-000000000003'
),
(
    '61000000-0000-0000-0000-000000000009',
    'HIGH',
    'HIGH',
    'HIGH',
    '60000000-0000-0000-0000-000000000003'
);


-- =========================================================
-- 12. TICKETS
-- 36 TICKETS
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
    assigned_at,
    first_response_at,
    resolved_at,
    closed_at,
    created_at,
    updated_at,
    created_by,
    updated_by
)
SELECT
    md5('ticket-' || gs)::uuid,

    'HLP-' || LPAD(gs::TEXT, 4, '0'),

    -- FIXED:
    -- reporter_id must reference USERS table.
    -- Previous version incorrectly used 10000000... IDs
    -- which belong to support_teams.
    CASE
        WHEN gs % 5 = 1 THEN
            '00000000-0000-0000-0000-000000000001'::uuid
        WHEN gs % 5 = 2 THEN
                'NEW',
            '00000000-0000-0000-0000-000000000002'::uuid
        WHEN gs % 5 = 3 THEN
            '00000000-0000-0000-0000-000000000003'::uuid
        WHEN gs % 5 = 4 THEN
            '00000000-0000-0000-0000-000000000001'::uuid
        ELSE
            '00000000-0000-0000-0000-000000000002'::uuid
    END,

    (
        ARRAY[
            '20000000-0000-0000-0000-000000000001',
            '20000000-0000-0000-0000-000000000002',
            '20000000-0000-0000-0000-000000000003',
            '20000000-0000-0000-0000-000000000004',
            '20000000-0000-0000-0000-000000000005',
            '20000000-0000-0000-0000-000000000006'
        ]
    )[1 + ((gs - 1) % 6)]::uuid,

    -- FIXED:
    -- location_id is NOT NULL in the schema.
    -- Therefore every ticket receives a valid location.
    (
        ARRAY[
            '30000000-0000-0000-0000-000000000001',
            '30000000-0000-0000-0000-000000000002',
            '30000000-0000-0000-0000-000000000003',
            '30000000-0000-0000-0000-000000000004',
            '30000000-0000-0000-0000-000000000005',
            '30000000-0000-0000-0000-000000000006'
        ]
    )[1 + ((gs - 1) % 6)]::uuid,

    -- asset_id is nullable, so NULL is allowed here.
    CASE
        WHEN gs % 5 = 0 THEN
            NULL::uuid
        ELSE
            (
                ARRAY[
                    '40000000-0000-0000-0000-000000000001',
                    '40000000-0000-0000-0000-000000000002',
                    '40000000-0000-0000-0000-000000000003',
                    '40000000-0000-0000-0000-000000000004',
                    '40000000-0000-0000-0000-000000000005'
                ]
            )[1 + ((gs - 1) % 5)]::uuid
    END,

    CASE
        WHEN gs % 6 IN (0, 5) THEN
            '60000000-0000-0000-0000-000000000003'::uuid
        WHEN gs % 3 = 0 THEN
            '60000000-0000-0000-0000-000000000002'::uuid
        ELSE
            '60000000-0000-0000-0000-000000000001'::uuid
    END,

    (
        ARRAY[
            'Wi-Fi connection is unstable',
            'Desktop computer does not start',
            'Software installation failed',
            'Power outlet is not working',
            'Air conditioner is leaking water',
            'Security camera is offline',
            'Internet connection is very slow',
            'Monitor displays a black screen',
            'Printer is not printing documents',
            'Application crashes during login',
            'Electrical power keeps disconnecting',
            'Classroom temperature is too high'
        ]
    )[1 + ((gs - 1) % 12)] ||
    ' - Case ' || gs,

    (
        ARRAY[
            'The Wi-Fi connection drops every few minutes and students cannot access the university network.',
            'The desktop computer suddenly stopped working and does not power on even after checking the cable.',
            'The required software cannot be installed and shows an installation error during setup.',
            'The electrical outlet is not providing power and the equipment connected to it cannot operate.',
            'The air conditioner is leaking water inside the room and the floor becomes wet.',
            'The security camera is offline and the monitoring screen shows no signal.',
            'Internet access is extremely slow during class and several students are affected.',
            'The monitor remains black although the computer appears to be running.',
            'The printer accepts the document but does not produce any printed pages.',
            'The application closes unexpectedly when the user tries to sign in.',
            'Electrical power disconnects repeatedly and several devices restart unexpectedly.',
            'The classroom is very hot because the air conditioner is not cooling properly.'
        ]
    )[1 + ((gs - 1) % 12)] ||
    ' Additional report number ' || gs || '.',

    (
        ARRAY['LOW','MEDIUM','HIGH']::impact_level[]
    )[1 + ((gs - 1) % 3)],

    (
        ARRAY['LOW','MEDIUM','HIGH']::urgency_level[]
    )[1 + ((gs + 1) % 3)],

    (
        ARRAY['LOW','MEDIUM','HIGH']::priority_level[]
    )[1 + ((gs + 2) % 3)],

    (
        ARRAY[
            'NEW',
            'TRIAGED',
            'ASSIGNED',
            'IN_PROGRESS',
            'WAITING',
            'RESOLVED',
            'REOPENED',
            'CLOSED'
        ]::ticket_status[]
    )[1 + ((gs - 1) % 8)],

    CASE
        WHEN gs % 8 = 1 THEN NULL
        ELSE
            '2026-09-01 09:00:00+03'::timestamptz
            + ((gs - 1) * INTERVAL '7 hours')
    END,

    CASE
        WHEN gs % 8 = 1 THEN NULL
        ELSE
            '2026-09-01 09:30:00+03'::timestamptz
            + ((gs - 1) * INTERVAL '7 hours')
    END,

    CASE
        WHEN gs % 8 IN (6,7,0) THEN
            '2026-09-01 14:00:00+03'::timestamptz
            + ((gs - 1) * INTERVAL '7 hours')
        ELSE NULL
    END,

    CASE
        WHEN gs % 8 = 0 THEN
            '2026-09-01 16:00:00+03'::timestamptz
            + ((gs - 1) * INTERVAL '7 hours')
        ELSE NULL
    END,

    '2026-09-01 08:00:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours'),

    '2026-09-01 08:00:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours'),

    '00000000-0000-0000-0000-000000000001'::uuid,

    '00000000-0000-0000-0000-000000000004'::uuid

FROM generate_series(1,36) AS gs;

-- Requirements §9: ticket priority is derived from the priority matrix
-- (impact + urgency), never hard-coded.
UPDATE tickets t
SET priority = pm.priority
FROM priority_matrices pm
WHERE pm.impact = t.impact
  AND pm.urgency = t.urgency
  AND pm.is_active = TRUE;

-- Backfill SLA due dates from the configured SLA profile targets
-- (same elapsed-minutes rule the backend uses on ticket creation).
UPDATE tickets t
SET response_due_at = t.created_at
      + make_interval(mins => sp.response_target_minutes),
    resolution_due_at = t.created_at
      + make_interval(mins => sp.resolution_target_minutes)
FROM sla_profiles sp
WHERE sp.sla_profile_id = t.sla_profile_id
  AND t.response_due_at IS NULL;


-- =========================================================
-- 13. TICKET SLA EXECUTIONS
-- =========================================================

INSERT INTO ticket_sla_executions (
    ticket_sla_execution_id,
    ticket_id,
    sla_profile_id,
    response_target_minutes,
    resolution_target_minutes,
    business_hours_id,
    response_due_at,
    resolution_due_at,
    resolution_sla_started_at,
    sla_status,
    response_breached_at,
    resolution_breached_at,
    effective_from,
    effective_to,
    is_current,
    reason,
    created_by
)
SELECT
    md5('sla-execution-' || gs)::uuid,

    md5('ticket-' || gs)::uuid,

    -- FIXED: explicit UUID cast
    CASE
        WHEN gs % 6 IN (0,5) THEN
            '60000000-0000-0000-0000-000000000003'::uuid
        WHEN gs % 3 = 0 THEN
            '60000000-0000-0000-0000-000000000002'::uuid
        ELSE
            '60000000-0000-0000-0000-000000000001'::uuid
    END,

    CASE
        WHEN gs % 6 IN (0,5) THEN 15
        WHEN gs % 3 = 0 THEN 60
        ELSE 120
    END,

    CASE
        WHEN gs % 6 IN (0,5) THEN 120
        WHEN gs % 3 = 0 THEN 480
        ELSE 1440
    END,

    '50000000-0000-0000-0000-000000000001'::uuid,

    '2026-09-01 10:00:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours'),

    '2026-09-02 10:00:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours'),

    '2026-09-01 08:30:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours'),

    CASE
        WHEN gs % 3 = 0 THEN 'BREACHED'
        WHEN gs % 3 = 1 THEN 'ON_TRACK'
        ELSE 'AT_RISK'
    END::sla_status,

    CASE
        WHEN gs % 3 = 0 THEN
            '2026-09-01 12:00:00+03'::timestamptz
            + ((gs - 1) * INTERVAL '7 hours')
        ELSE NULL
    END,

    CASE
        WHEN gs % 3 = 0 THEN
            '2026-09-02 12:00:00+03'::timestamptz
            + ((gs - 1) * INTERVAL '7 hours')
        ELSE NULL
    END,

    '2026-09-01 08:30:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours'),

    NULL,

    TRUE,

    CASE
        WHEN gs % 3 = 0 THEN 'Resolution target exceeded'
        WHEN gs % 3 = 1 THEN 'Within expected SLA'
        ELSE 'Approaching resolution target'
    END,

    '00000000-0000-0000-0000-000000000008'::uuid

FROM generate_series(1,36) AS gs;


-- =========================================================
-- 14. ASSIGNMENTS
-- =========================================================

INSERT INTO assignments (
    assignment_id,
    ticket_id,
    assigned_to,
    assigned_team_id,
    assigned_by,
    assigned_at,
    unassigned_at,
    is_current,
    reason
)
SELECT
    md5('assignment-' || gs)::uuid,
    md5('ticket-' || gs)::uuid,

    CASE
        WHEN gs % 3 = 1 THEN
            '00000000-0000-0000-0000-000000000005'::uuid
        WHEN gs % 3 = 2 THEN
            '00000000-0000-0000-0000-000000000006'::uuid
        ELSE
            '00000000-0000-0000-0000-000000000007'::uuid
    END,

    CASE
        WHEN gs % 3 = 1 THEN
            '10000000-0000-0000-0000-000000000001'::uuid
        WHEN gs % 3 = 2 THEN
            '10000000-0000-0000-0000-000000000002'::uuid
        ELSE
            '10000000-0000-0000-0000-000000000003'::uuid
    END,

    '00000000-0000-0000-0000-000000000004'::uuid,

    '2026-09-01 09:00:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours'),

    NULL,

    TRUE,

    CASE
        WHEN gs % 3 = 0 THEN 'Assigned to facilities technician'
        WHEN gs % 3 = 1 THEN 'Assigned to IT support technician'
        ELSE 'Assigned to network/electrical technician'
    END

FROM generate_series(1,36) AS gs;


-- Historical reassignment records

INSERT INTO assignments (
    assignment_id,
    ticket_id,
    assigned_to,
    assigned_team_id,
    assigned_by,
    assigned_at,
    unassigned_at,
    is_current,
    reason
)
VALUES
(
    '70000000-0000-0000-0000-000000000001',
    md5('ticket-4')::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-02 09:00:00+03',
    '2026-09-02 11:00:00+03',
    FALSE,
    'Initial assignment changed'
),
(
    '70000000-0000-0000-0000-000000000002',
    md5('ticket-12')::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-04 09:00:00+03',
    '2026-09-04 13:00:00+03',
    FALSE,
    'Transferred due to workload'
);


-- =========================================================
-- 15. STATUS HISTORIES
-- =========================================================

INSERT INTO status_histories (
    status_history_id,
    ticket_id,
    changed_by,
    old_status,
    new_status,
    reason,
    changed_at
)
SELECT
    md5('status-history-' || gs)::uuid,
    md5('ticket-' || gs)::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    NULL,
    'NEW',
    'Ticket created',
    '2026-09-01 08:00:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours')
FROM generate_series(1,36) AS gs;


INSERT INTO status_histories (
    status_history_id,
    ticket_id,
    changed_by,
    old_status,
    new_status,
    reason,
    changed_at
)
SELECT
    md5('status-history-2-' || gs)::uuid,
    md5('ticket-' || gs)::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'NEW',
    (
        ARRAY[
            'TRIAGED',
            'ASSIGNED',
            'IN_PROGRESS',
            'WAITING',
            'RESOLVED',
            'REOPENED',
            'CLOSED'
        ]::ticket_status[]
    )[1 + ((gs - 1) % 7)],
    'Ticket workflow update',
    '2026-09-01 10:00:00+03'::timestamptz
    + ((gs - 1) * INTERVAL '7 hours')
FROM generate_series(1,36) AS gs;


-- =========================================================
-- 16. TICKET EVENTS
-- =========================================================

INSERT INTO ticket_events (
    ticket_event_id,
    ticket_id,
    actor_user_id,
    event_type,
    description,
    old_value,
    new_value,
    created_at
)
VALUES

(
    '80000000-0000-0000-0000-000000000001',
    md5('ticket-1')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'TICKET_CREATED',
    'Ticket submitted by reporter',
    NULL,
    '{"status":"NEW"}',
    '2026-09-01 08:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000002',
    md5('ticket-2')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'CATEGORY_CHANGED',
    'Category confirmed by agent',
    '{"category":"Other"}',
    '{"category":"Network"}',
    '2026-09-01 09:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000003',
    md5('ticket-3')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'PRIORITY_CHANGED',
    'Priority increased after triage',
    '{"priority":"LOW"}',
    '{"priority":"HIGH"}',
    '2026-09-01 09:30:00+03'
),

(
    '80000000-0000-0000-0000-000000000004',
    md5('ticket-4')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'ASSIGNED',
    'Ticket assigned to technician',
    NULL,
    '{"assigned_to":"Karim Electrical"}',
    '2026-09-02 09:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000005',
    md5('ticket-5')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'REASSIGNED',
    'Ticket transferred to another technician',
    '{"assigned_to":"Youssef Network"}',
    '{"assigned_to":"Karim Electrical"}',
    '2026-09-02 10:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000006',
    md5('ticket-6')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'COMMENT_ADDED',
    'Reporter added additional information',
    NULL,
    '{"comment":"Issue still happens during class"}',
    '2026-09-02 11:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000007',
    md5('ticket-7')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'ATTACHMENT_ADDED',
    'Reporter uploaded a photo',
    NULL,
    '{"file":"network_error.jpg"}',
    '2026-09-02 11:30:00+03'
),

(
    '80000000-0000-0000-0000-000000000008',
    md5('ticket-8')::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    'WORK_LOG_ADDED',
    'Technician recorded diagnostic work',
    NULL,
    '{"minutes":45}',
    '2026-09-02 12:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000009',
    md5('ticket-9')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'STATUS_CHANGED',
    'Ticket moved to in progress after assignment',
    '{"status":"ASSIGNED"}',
    '{"status":"IN_PROGRESS"}',
    '2026-09-02 12:30:00+03'
),

(
    '80000000-0000-0000-0000-000000000010',
    md5('ticket-10')::uuid,
    '00000000-0000-0000-0000-000000000008'::uuid,
    'ESCALATED',
    'Ticket escalated to manager',
    NULL,
    '{"level":"MANAGER"}',
    '2026-09-03 09:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000011',
    md5('ticket-11')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'SLA_RISK_DETECTED',
    'Ticket approaching SLA deadline',
    NULL,
    '{"sla_status":"AT_RISK"}',
    '2026-09-03 10:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000012',
    md5('ticket-12')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'SLA_BREACHED',
    'Resolution target exceeded',
    NULL,
    '{"sla_status":"BREACHED"}',
    '2026-09-03 11:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000013',
    md5('ticket-13')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'AI_SUGGESTION_CREATED',
    'AI suggested ticket category',
    NULL,
    '{"category":"Network","confidence":0.91}',
    '2026-09-03 12:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000014',
    md5('ticket-14')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'AI_SUGGESTION_ACCEPTED',
    'Agent accepted AI prediction',
    '{"category":"Network"}',
    '{"accepted":true}',
    '2026-09-03 12:30:00+03'
),

(
    '80000000-0000-0000-0000-000000000015',
    md5('ticket-15')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'AI_SUGGESTION_OVERRIDDEN',
    'Agent changed AI suggestion',
    '{"category":"Hardware"}',
    '{"category":"Software"}',
    '2026-09-03 13:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000016',
    md5('ticket-16')::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    'RESOLVED',
    'Technician resolved the issue',
    '{"status":"IN_PROGRESS"}',
    '{"status":"RESOLVED"}',
    '2026-09-03 14:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000017',
    md5('ticket-17')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'REOPENED',
    'Reporter reported that the problem returned',
    '{"status":"RESOLVED"}',
    '{"status":"REOPENED"}',
    '2026-09-03 15:00:00+03'
),

(
    '80000000-0000-0000-0000-000000000018',
    md5('ticket-18')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'CLOSED',
    'Ticket closed after confirmation',
    '{"status":"RESOLVED"}',
    '{"status":"CLOSED"}',
    '2026-09-03 16:00:00+03'
);


-- =========================================================
-- 17. COMMENTS
-- =========================================================

INSERT INTO comments (
    comment_id,
    ticket_id,
    user_id,
    body,
    visibility
)
VALUES
(
    '90000000-0000-0000-0000-000000000001',
    md5('ticket-1')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'The connection drops several times every hour.',
    'REPORTER_VISIBLE'
),
(
    '90000000-0000-0000-0000-000000000002',
    md5('ticket-2')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'Technician assigned for hardware inspection.',
    'INTERNAL'
),
(
    '90000000-0000-0000-0000-000000000003',
    md5('ticket-3')::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    'Replacement component is required.',
    'INTERNAL'
),
(
    '90000000-0000-0000-0000-000000000004',
    md5('ticket-4')::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'The problem is affecting the entire classroom.',
    'REPORTER_VISIBLE'
),
(
    '90000000-0000-0000-0000-000000000005',
    md5('ticket-5')::uuid,
    '00000000-0000-0000-0000-000000000007'::uuid,
    'AC unit requires maintenance.',
    'INTERNAL'
),
(
    '90000000-0000-0000-0000-000000000006',
    md5('ticket-6')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Issue is still present after restarting the device.',
    'REPORTER_VISIBLE'
);


-- =========================================================
-- 18. ATTACHMENTS
-- =========================================================

INSERT INTO attachments (
    attachment_id,
    ticket_id,
    uploaded_by,
    storage_path,
    file_uuid,
    file_name,
    mime_type,
    file_size,
    submitted_at,
    visibility
)
VALUES
(
    '91000000-0000-0000-0000-000000000001',
    md5('ticket-1')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '/uploads/tickets/1/network_error.jpg',
    '92000000-0000-0000-0000-000000000001'::uuid,
    'network_error.jpg',
    'image/jpeg',
    245760,
    '2026-09-01 08:15:00+03',
    'REPORTER_VISIBLE'
),
(
    '91000000-0000-0000-0000-000000000002',
    md5('ticket-4')::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '/uploads/tickets/4/power_outlet.jpg',
    '92000000-0000-0000-0000-000000000002'::uuid,
    'power_outlet.jpg',
    'image/jpeg',
    187420,
    '2026-09-02 09:20:00+03',
    'REPORTER_VISIBLE'
),
(
    '91000000-0000-0000-0000-000000000003',
    md5('ticket-6')::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '/uploads/tickets/6/camera.png',
    '92000000-0000-0000-0000-000000000003'::uuid,
    'camera.png',
    'image/png',
    345600,
    '2026-09-02 10:30:00+03',
    'INTERNAL'
);


-- =========================================================
-- 19. WORK LOGS
-- =========================================================

INSERT INTO work_logs (
    work_log_id,
    ticket_id,
    user_id,
    diagnosis,
    actions_taken,
    parts_used,
    time_spent_minutes,
    resolution_code
)
VALUES
(
    '93000000-0000-0000-0000-000000000001',
    md5('ticket-2')::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    'Power supply failure detected.',
    'Checked power cable and replaced faulty adapter.',
    'Power adapter',
    45,
    'FIXED'
),
(
    '93000000-0000-0000-0000-000000000002',
    md5('ticket-5')::uuid,
    '00000000-0000-0000-0000-000000000007'::uuid,
    'AC drainage pipe blocked.',
    'Cleaned drainage pipe and tested cooling.',
    'Drainage cleaning kit',
    60,
    'FIXED'
),
(
    '93000000-0000-0000-0000-000000000003',
    md5('ticket-8')::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid,
    'Switch port configuration issue.',
    'Reset port configuration and tested connectivity.',
    NULL,
    35,
    'CONFIGURATION_CHANGED'
),
(
    '93000000-0000-0000-0000-000000000004',
    md5('ticket-16')::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    'Faulty electrical socket.',
    'Replaced socket and verified voltage.',
    'Electrical socket',
    50,
    'REPAIRED'
),
(
    '93000000-0000-0000-0000-000000000005',
    md5('ticket-24')::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid,
    'DNS configuration problem.',
    'Updated DNS configuration and verified access.',
    NULL,
    30,
    'CONFIGURATION_CHANGED'
);


-- =========================================================
-- 20. FEEDBACK
-- =========================================================

INSERT INTO feedback (
    feedback_id,
    ticket_id,
    user_id,
    rating,
    confirmation_status,
    comment,
    reopened_reason
)
VALUES
(
    '94000000-0000-0000-0000-000000000001',
    md5('ticket-6')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    5,
    'CONFIRMED',
    'Problem was solved quickly.',
    NULL
),
(
    '94000000-0000-0000-0000-000000000002',
    md5('ticket-7')::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    4,
    'CONFIRMED',
    'Issue resolved successfully.',
    NULL
),
(
    '94000000-0000-0000-0000-000000000003',
    md5('ticket-8')::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    2,
    'REOPENED',
    'The problem returned after the first fix.',
    'Network connection failed again.'
),
(
    '94000000-0000-0000-0000-000000000004',
    md5('ticket-16')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    3,
    'CONFIRMED',
    'Resolved but took longer than expected.',
    NULL
);


-- =========================================================
-- 21. ESCALATIONS
-- =========================================================

INSERT INTO escalations (
    escalation_id,
    ticket_id,
    trigger_type,
    reason,
    from_user_id,
    assigned_to,
    triggered_at,
    resolved_at,
    status
)
VALUES
(
    '95000000-0000-0000-0000-000000000001',
    md5('ticket-3')::uuid,
    'SLA_RISK',
    'Resolution target is approaching.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000008'::uuid,
    '2026-09-02 12:00:00+03',
    NULL,
    'OPEN'
),
(
    '95000000-0000-0000-0000-000000000002',
    md5('ticket-9')::uuid,
    'SLA_BREACH',
    'Resolution SLA has been exceeded.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000008'::uuid,
    '2026-09-03 13:00:00+03',
    '2026-09-03 15:00:00+03',
    'RESOLVED'
),
(
    '95000000-0000-0000-0000-000000000003',
    md5('ticket-15')::uuid,
    'URGENT',
    'Critical electrical issue requires immediate attention.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000008'::uuid,
    '2026-09-04 09:00:00+03',
    NULL,
    'OPEN'
),
(
    '95000000-0000-0000-0000-000000000004',
    md5('ticket-20')::uuid,
    'MANUAL',
    'Manager requested additional investigation.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000008'::uuid,
    '2026-09-05 10:00:00+03',
    '2026-09-05 14:00:00+03',
    'RESOLVED'
);


-- =========================================================
-- 22. NOTIFICATIONS
-- =========================================================

INSERT INTO notifications (
    notification_id,
    recipient_user_id,
    notification_type,
    title,
    body,
    ticket_id,
    related_user_id,
    is_read,
    read_at
)
VALUES
(
    '96000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'TICKET_UPDATE',
    'Ticket assigned',
    'Your ticket has been assigned to a technician.',
    md5('ticket-1')::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    TRUE,
    '2026-09-01 10:00:00+03'
),
(
    '96000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002'::uuid,
    'SLA_WARNING',
    'SLA at risk',
    'Your ticket is approaching its SLA deadline.',
    md5('ticket-3')::uuid,
    NULL,
    FALSE,
    NULL
),
(
    '96000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004'::uuid,
    'AI_SUGGESTION',
    'AI prediction ready',
    'A category prediction is ready for review.',
    md5('ticket-13')::uuid,
    NULL,
    TRUE,
    '2026-09-03 12:15:00+03'
),
(
    '96000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000008'::uuid,
    'ESCALATION',
    'Ticket escalated',
    'A critical ticket requires manager attention.',
    md5('ticket-15')::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    FALSE,
    NULL
);


-- =========================================================
-- 23. AI MODEL VERSIONS
-- =========================================================

INSERT INTO ai_model_versions (
    model_version_id,
    model_name,
    version,
    model_type,
    dataset_version,
    metric_name,
    metric_value,
    fallback_description
)
VALUES
(
    '97000000-0000-0000-0000-000000000001',
    'Ticket Category Classifier',
    '1.0',
    'Text Classification',
    'HLP-DATASET-1.0',
    'accuracy',
    0.86,
    'Keyword and rule based fallback'
),
(
    '97000000-0000-0000-0000-000000000002',
    'Ticket Priority Predictor',
    '1.0',
    'Classification',
    'HLP-DATASET-1.0',
    'f1_score',
    0.81,
    'Impact and urgency matrix fallback'
),
(
    '97000000-0000-0000-0000-000000000003',
    'Duplicate Ticket Detector',
    '1.0',
    'Similarity',
    'HLP-DATASET-1.0',
    'f1_score',
    0.78,
    'Text similarity threshold fallback'
),
(
    '97000000-0000-0000-0000-000000000004',
    'SLA Risk Predictor',
    '1.0',
    'Classification',
    'HLP-DATASET-1.0',
    'f1_score',
    0.83,
    'Rule-based SLA monitoring fallback'
);


-- =========================================================
-- 24. PREDICTIONS
-- =========================================================

INSERT INTO predictions (
    prediction_id,
    ticket_id,
    model_version_id,
    prediction_type,
    predicted_value,
    confidence,
    explanation,
    reviewed_by,
    reviewed_at,
    decision,
    override_value
)
VALUES

(
    '98000000-0000-0000-0000-000000000001',
    md5('ticket-1')::uuid,
    '97000000-0000-0000-0000-000000000001'::uuid,
    'CATEGORY',
    'Network',
    0.94,
    'Detected Wi-Fi and network connectivity keywords.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-01 09:00:00+03',
    'ACCEPTED',
    NULL
),

(
    '98000000-0000-0000-0000-000000000002',
    md5('ticket-2')::uuid,
    '97000000-0000-0000-0000-000000000001'::uuid,
    'CATEGORY',
    'Hardware',
    0.91,
    'Detected desktop, computer and power keywords.',
    NULL,
    NULL,
    'PENDING',
    NULL
),

(
    '98000000-0000-0000-0000-000000000003',
    md5('ticket-3')::uuid,
    '97000000-0000-0000-0000-000000000001'::uuid,
    'CATEGORY',
    'Hardware',
    0.63,
    'Prediction based on device and installation terms.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-01 10:00:00+03',
    'OVERRIDDEN',
    'Software'
),

(
    '98000000-0000-0000-0000-000000000004',
    md5('ticket-4')::uuid,
    '97000000-0000-0000-0000-000000000002'::uuid,
    'PRIORITY',
    'HIGH',
    0.88,
    'High impact and high urgency indicators detected.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-02 09:30:00+03',
    'ACCEPTED',
    NULL
),

(
    '98000000-0000-0000-0000-000000000005',
    md5('ticket-5')::uuid,
    '97000000-0000-0000-0000-000000000003'::uuid,
    'DUPLICATE',
    'ticket-1',
    0.79,
    'Similar Wi-Fi connectivity symptoms detected.',
    NULL,
    NULL,
    'PENDING',
    NULL
),

(
    '98000000-0000-0000-0000-000000000006',
    md5('ticket-6')::uuid,
    '97000000-0000-0000-0000-000000000004'::uuid,
    'SLA_RISK',
    'AT_RISK',
    0.89,
    'Ticket has consumed most of its resolution target.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-02 11:00:00+03',
    'ACCEPTED',
    NULL
),

(
    '98000000-0000-0000-0000-000000000007',
    md5('ticket-13')::uuid,
    '97000000-0000-0000-0000-000000000001'::uuid,
    'CATEGORY',
    'Network',
    0.92,
    'Network-related keywords detected.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-03 12:30:00+03',
    'ACCEPTED',
    NULL
),

(
    '98000000-0000-0000-0000-000000000008',
    md5('ticket-14')::uuid,
    '97000000-0000-0000-0000-000000000002'::uuid,
    'PRIORITY',
    'MEDIUM',
    0.71,
    'Medium impact and urgency combination.',
    '00000000-0000-0000-0000-000000000004'::uuid,
    '2026-09-03 13:00:00+03',
    'OVERRIDDEN',
    'HIGH'
),

(
    '98000000-0000-0000-0000-000000000009',
    md5('ticket-15')::uuid,
    '97000000-0000-0000-0000-000000000004'::uuid,
    'SLA_RISK',
    'BREACHED',
    0.96,
    'Resolution target has already been exceeded.',
    NULL,
    NULL,
    'PENDING',
    NULL
);


-- =========================================================
-- 25. TICKET RELATIONS
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
    '99000000-0000-0000-0000-000000000001',
    md5('ticket-5')::uuid,
    md5('ticket-1')::uuid,
    'DUPLICATE_OF',
    '00000000-0000-0000-0000-000000000004'::uuid
),
(
    '99000000-0000-0000-0000-000000000002',
    md5('ticket-10')::uuid,
    md5('ticket-2')::uuid,
    'RELATED_TO',
    '00000000-0000-0000-0000-000000000004'::uuid
),
(
    '99000000-0000-0000-0000-000000000003',
    md5('ticket-20')::uuid,
    md5('ticket-15')::uuid,
    'RELATED_TO',
    '00000000-0000-0000-0000-000000000008'::uuid
);


-- =========================================================
-- 26. AUDIT LOGS
-- =========================================================

INSERT INTO audit_logs (
    audit_log_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    ip_address
)
VALUES
(
    '9a000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004'::uuid,
    'CREATE',
    'TICKET',
    md5('ticket-1')::uuid,
    '192.168.1.20'
),
(
    '9a000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004'::uuid,
    'UPDATE',
    'TICKET',
    md5('ticket-3')::uuid,
    '192.168.1.20'
),
(
    '9a000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000008'::uuid,
    'ESCALATE',
    'TICKET',
    md5('ticket-15')::uuid,
    '192.168.1.30'
),
(
    '9a000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000009'::uuid,
    'AUDIT',
    'TICKET',
    md5('ticket-20')::uuid,
    '192.168.1.40'
);


-- =========================================================
-- FINAL COMMIT
-- =========================================================

COMMIT;


-- =========================================================
-- QUICK VALIDATION
-- =========================================================

SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'support_teams', COUNT(*) FROM support_teams
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL
SELECT 'ticket_sla_executions', COUNT(*) FROM ticket_sla_executions
UNION ALL
SELECT 'assignments', COUNT(*) FROM assignments
UNION ALL
SELECT 'status_histories', COUNT(*) FROM status_histories
UNION ALL
SELECT 'ticket_events', COUNT(*) FROM ticket_events
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL
SELECT 'work_logs', COUNT(*) FROM work_logs
UNION ALL
SELECT 'feedback', COUNT(*) FROM feedback
UNION ALL
SELECT 'escalations', COUNT(*) FROM escalations
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'ai_model_versions', COUNT(*) FROM ai_model_versions
UNION ALL
SELECT 'predictions', COUNT(*) FROM predictions
UNION ALL
SELECT 'ticket_relations', COUNT(*) FROM ticket_relations
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
ORDER BY table_name;


-- =========================================================
-- ENUM COVERAGE CHECKS
-- =========================================================

SELECT DISTINCT role
FROM users
ORDER BY role;

SELECT DISTINCT account_status
FROM users
ORDER BY account_status;

SELECT DISTINCT impact
FROM tickets
ORDER BY impact;

SELECT DISTINCT urgency
FROM tickets
ORDER BY urgency;

SELECT DISTINCT priority
FROM tickets
ORDER BY priority;

SELECT DISTINCT status
FROM tickets
ORDER BY status;

SELECT DISTINCT sla_status
FROM ticket_sla_executions
ORDER BY sla_status;

SELECT DISTINCT event_type
FROM ticket_events
ORDER BY event_type;

SELECT DISTINCT visibility
FROM comments
ORDER BY visibility;

SELECT DISTINCT trigger_type
FROM escalations
ORDER BY trigger_type;

SELECT DISTINCT prediction_type
FROM predictions
ORDER BY prediction_type;

SELECT DISTINCT decision
FROM predictions
ORDER BY decision;

SELECT DISTINCT relation_type
FROM ticket_relations
ORDER BY relation_type;