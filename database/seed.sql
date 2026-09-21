-- ============================================
-- Campus Helpdesk - Seed Data
-- ============================================
INSERT INTO role (role_name)
VALUES
    ('admin'),
    ('support_agent'),
    ('technician'),
    ('requester')
ON CONFLICT (role_name) DO NOTHING;