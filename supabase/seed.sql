-- ============================================================================
-- Seed File: Development Test Data
-- ============================================================================
-- Purpose: Create test users and sample data for local development
--
-- Test Users:
--   - 00000000-0000-0000-0000-000000000001 (primary test user)
--   - 00000000-0000-0000-0000-000000000002 (secondary test user)
--
-- WARNING: This is for DEVELOPMENT ONLY. Never run in production.
-- ============================================================================

-- ============================================================================
-- 1. Create test users in auth.users table
-- ============================================================================

-- Insert test users into auth.users
-- These match the UUIDs used in dev mode authentication bypass
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test-user-1@viberide.local',
    '$2a$10$dummyhashfordevonlydummyhashfordevonly', -- dummy bcrypt hash
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Test User 1"}',
    false,
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test-user-2@viberide.local',
    '$2a$10$dummyhashfordevonlydummyhashfordevonly', -- dummy bcrypt hash
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Test User 2"}',
    false,
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Create identities for test users
-- ============================================================================
-- Note: We'll skip identities as they're not strictly required for dev mode

-- ============================================================================
-- 3. Create sample user preferences
-- ============================================================================

INSERT INTO viberide.user_preferences (
  user_id,
  terrain,
  road_type,
  typical_duration_h,
  typical_distance_km
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'paved',
    'scenic',
    2.5,
    150.0
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'mixed',
    'twisty',
    4.0,
    200.0
  )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 4. Create sample notes for test user 1
-- ============================================================================

INSERT INTO viberide.notes (
  note_id,
  user_id,
  title,
  note_text,
  trip_prefs
) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Weekend Ride to Big Sur',
    'Planning a scenic coastal ride from San Francisco to Big Sur. Want to take Highway 1 and stop at some viewpoints. Looking for twisty roads with ocean views.',
    '{"terrain":"paved","road_type":"scenic","duration_h":6.0,"distance_km":250.0}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Quick Evening Loop',
    'Short ride after work through the hills. Want something fun and twisty, about 1-2 hours.',
    '{"terrain":"paved","road_type":"twisty","duration_h":1.5,"distance_km":80.0}'::jsonb
  )
ON CONFLICT (note_id) DO NOTHING;

-- ============================================================================
-- Seed Complete
-- ============================================================================
-- Summary:
--   ✓ Created 2 test users in auth.users
--   ✓ Created 2 identities for test users
--   ✓ Created 2 user preferences records
--   ✓ Created 2 sample notes for test user 1
--
-- Test User Credentials:
--   User 1: 00000000-0000-0000-0000-000000000001 (test-user-1@viberide.local)
--   User 2: 00000000-0000-0000-0000-000000000002 (test-user-2@viberide.local)
--
-- Usage:
--   In DEVENV mode, the middleware will use User 1 by default
-- ============================================================================

