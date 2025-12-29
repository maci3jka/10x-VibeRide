-- ============================================================================
-- Migration: Disable RLS for Development
-- ============================================================================
-- Purpose: Disable Row-Level Security entirely for development purposes
--   This allows the application to access tables without authentication checks.
--
-- Affected Tables:
--   - viberide.user_preferences
--   - viberide.notes
--   - viberide.itineraries
--
-- WARNING: This is for DEVELOPMENT ONLY. Do not use in production.
--          In production, you should use proper RLS policies.
-- ============================================================================

-- Disable RLS on all viberide tables
ALTER TABLE viberide.user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE viberide.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE viberide.itineraries DISABLE ROW LEVEL SECURITY;

-- Grant usage on schema to anon and authenticated roles
GRANT USAGE ON SCHEMA viberide TO anon, authenticated;

-- Grant all privileges on all tables to anon and authenticated
GRANT ALL ON ALL TABLES IN SCHEMA viberide TO anon, authenticated;

-- Grant all privileges on all sequences to anon and authenticated
GRANT ALL ON ALL SEQUENCES IN SCHEMA viberide TO anon, authenticated;

-- Grant execute on all functions to anon and authenticated
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA viberide TO anon, authenticated;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA viberide
  GRANT ALL ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA viberide
  GRANT ALL ON SEQUENCES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA viberide
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
--   ✓ Disabled RLS on all viberide tables
--   ✓ Granted schema usage to anon and authenticated roles
--   ✓ Granted all privileges on tables, sequences, and functions
--   ✓ Set default privileges for future objects
--
-- Current State:
--   - RLS is DISABLED on all tables
--   - All roles can access all data (development mode)
--
-- Next Steps:
--   1. Reset your Supabase database: supabase db reset
--   2. Restart your dev server
-- ============================================================================

