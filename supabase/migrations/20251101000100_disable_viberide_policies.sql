-- ============================================================================
-- Migration: Disable All RLS Policies in VibeRide Schema
-- ============================================================================
-- Purpose: Drop all Row-Level Security policies from VibeRide tables
--   This migration removes all RLS policies while keeping RLS enabled on tables.
--   Useful for development, testing, or when implementing alternative access control.
--
-- Affected Tables:
--   - viberide.user_preferences
--   - viberide.notes
--   - viberide.itineraries
--
-- Special Considerations:
--   - RLS remains ENABLED on all tables (only policies are dropped)
--   - After running this migration, tables will be inaccessible to users
--     unless new policies are created or RLS is disabled entirely
--   - Service role will still have access via Supabase's built-in mechanisms
--
-- WARNING: This is a destructive operation. All existing policies will be removed.
--          Ensure you have a backup or can recreate policies if needed.
-- ============================================================================

-- ============================================================================
-- 1. Drop all policies from user_preferences table
-- ============================================================================

-- Drop service role policy
drop policy if exists "service_role_full_access_user_preferences" on viberide.user_preferences;

-- Drop authenticated user policies
drop policy if exists "authenticated_select_own_user_preferences" on viberide.user_preferences;
drop policy if exists "authenticated_insert_own_user_preferences" on viberide.user_preferences;
drop policy if exists "authenticated_update_own_user_preferences" on viberide.user_preferences;
drop policy if exists "authenticated_delete_own_user_preferences" on viberide.user_preferences;

-- ============================================================================
-- 2. Drop all policies from notes table
-- ============================================================================

-- Drop service role policy
drop policy if exists "service_role_full_access_notes" on viberide.notes;

-- Drop authenticated user policies
drop policy if exists "authenticated_select_own_notes" on viberide.notes;
drop policy if exists "authenticated_insert_own_notes" on viberide.notes;
drop policy if exists "authenticated_update_own_notes" on viberide.notes;
drop policy if exists "authenticated_delete_own_notes" on viberide.notes;

-- ============================================================================
-- 3. Drop all policies from itineraries table
-- ============================================================================

-- Drop service role policy
drop policy if exists "service_role_full_access_itineraries" on viberide.itineraries;

-- Drop authenticated user policies
drop policy if exists "authenticated_select_own_itineraries" on viberide.itineraries;
drop policy if exists "authenticated_insert_own_itineraries" on viberide.itineraries;
drop policy if exists "authenticated_update_own_itineraries" on viberide.itineraries;
drop policy if exists "authenticated_delete_own_itineraries" on viberide.itineraries;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
--   ✓ Dropped all policies from viberide.user_preferences (5 policies)
--   ✓ Dropped all policies from viberide.notes (5 policies)
--   ✓ Dropped all policies from viberide.itineraries (5 policies)
--   ✓ Total: 15 policies removed
--
-- Current State:
--   - RLS is still ENABLED on all tables
--   - No policies exist, so regular users cannot access data
--   - Service role can still access via Supabase's built-in mechanisms
--
-- Next Steps (choose one):
--   1. Create new custom policies as needed
--   2. Disable RLS entirely: ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;
--   3. Use service_role key for all backend operations
--
-- To Re-enable Original Policies:
--   Run the original migration again or create a new migration with policies
-- ============================================================================

