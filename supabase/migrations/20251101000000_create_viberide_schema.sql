-- ============================================================================
-- Migration: Create VibeRide Schema
-- ============================================================================
-- Purpose: Initialize the complete VibeRide database schema including:
--   - Custom schema 'viberide' for domain tables
--   - ENUM types for terrain, road_type, and itinerary_status
--   - Core tables: user_preferences, notes, itineraries
--   - Indexes for performance optimization
--   - Row-Level Security (RLS) policies
--   - Triggers for automatic timestamp updates
--   - Materialized view for latest itineraries
--
-- Affected Tables:
--   - viberide.user_preferences (new)
--   - viberide.notes (new)
--   - viberide.itineraries (new)
--
-- Special Considerations:
--   - All tables reference auth.users(id) from Supabase Auth
--   - RLS is enabled on all domain tables
--   - Soft deletes implemented via deleted_at timestamps
--   - Full-text search enabled on notes.note_text
--   - Concurrency control: only one running itinerary per user
-- ============================================================================

-- ============================================================================
-- 1. Create dedicated schema for VibeRide domain tables
-- ============================================================================
create schema if not exists viberide;

-- ============================================================================
-- 2. Create ENUM types
-- ============================================================================

-- terrain: represents the surface type of riding routes
create type viberide.terrain as enum ('paved', 'gravel', 'mixed');

-- road_type: represents the style/characteristic of the road
create type viberide.road_type as enum ('scenic', 'twisty', 'highway');

-- itinerary_status: tracks the lifecycle of AI-generated itineraries
create type viberide.itinerary_status as enum (
  'pending',    -- queued for generation
  'running',    -- currently being generated
  'completed',  -- successfully generated
  'failed',     -- generation failed
  'cancelled'   -- user cancelled the generation
);

-- ============================================================================
-- 3. Create trigger function for automatic updated_at timestamps
-- ============================================================================

-- This function will be reused across all tables that need updated_at tracking
create or replace function viberide.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 4. Create user_preferences table
-- ============================================================================

-- Stores default riding preferences for each user
-- PK is user_id (1:1 relationship with auth.users)
create table viberide.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terrain viberide.terrain not null,
  road_type viberide.road_type not null,
  typical_duration_h numeric(4,1) not null check (typical_duration_h > 0),
  typical_distance_km numeric(6,1) not null check (typical_distance_km > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add comment for documentation
comment on table viberide.user_preferences is 'Stores default riding preferences for each user. One row per user.';
comment on column viberide.user_preferences.typical_duration_h is 'Default trip duration in hours (e.g., 2.5 for 2.5 hours)';
comment on column viberide.user_preferences.typical_distance_km is 'Default trip distance in kilometers';

-- Enable RLS on user_preferences
alter table viberide.user_preferences enable row level security;

-- RLS Policy: Allow service role full access for backend operations
create policy "service_role_full_access_user_preferences"
  on viberide.user_preferences
  for all
  using (auth.role() = 'service_role');

-- RLS Policy: Authenticated users can select their own preferences
create policy "authenticated_select_own_user_preferences"
  on viberide.user_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Authenticated users can insert their own preferences
create policy "authenticated_insert_own_user_preferences"
  on viberide.user_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Authenticated users can update their own preferences
create policy "authenticated_update_own_user_preferences"
  on viberide.user_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Authenticated users can delete their own preferences
create policy "authenticated_delete_own_user_preferences"
  on viberide.user_preferences
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger: Auto-update updated_at timestamp
create trigger set_timestamp_user_preferences
  before update on viberide.user_preferences
  for each row
  execute function viberide.set_timestamp();

-- ============================================================================
-- 5. Create notes table
-- ============================================================================

-- Stores user trip notes with optional AI-generated summaries
-- Each note can have multiple itineraries (versions)
create table viberide.notes (
  note_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title varchar(120) not null,
  note_text text not null check (char_length(note_text) <= 1500),
  trip_prefs jsonb not null default '{}'::jsonb,
  ai_summary jsonb,
  distance_km numeric(6,1) check (distance_km > 0),
  duration_h numeric(4,1) check (duration_h > 0),
  terrain viberide.terrain,
  road_type viberide.road_type,
  -- Full-text search vector generated from note_text
  search_vector tsvector generated always as (to_tsvector('simple', note_text)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

-- Add comments for documentation
comment on table viberide.notes is 'User trip notes that serve as input for AI-generated itineraries. Supports soft delete and archiving.';
comment on column viberide.notes.note_text is 'Plain-text trip note, max 1500 characters';
comment on column viberide.notes.trip_prefs is 'JSON object containing trip-specific preferences that override user defaults';
comment on column viberide.notes.ai_summary is 'AI-generated structured summary of the note';
comment on column viberide.notes.search_vector is 'Auto-generated full-text search index for note_text';
comment on column viberide.notes.archived_at is 'Timestamp when note was archived (soft archive)';
comment on column viberide.notes.deleted_at is 'Timestamp when note was deleted (soft delete)';

-- Unique constraint: user cannot have duplicate titles for non-deleted notes
create unique index idx_notes_unique_user_title
  on viberide.notes(user_id, title)
  where deleted_at is null;

-- Index: List notes per user by recency
create index idx_notes_user_updated
  on viberide.notes(user_id, updated_at desc);

-- Index: Full-text search on note_text via search_vector
create index idx_notes_search
  on viberide.notes using gin(search_vector);

-- Enable RLS on notes
alter table viberide.notes enable row level security;

-- RLS Policy: Allow service role full access for backend operations
create policy "service_role_full_access_notes"
  on viberide.notes
  for all
  using (auth.role() = 'service_role');

-- RLS Policy: Authenticated users can select their own notes
create policy "authenticated_select_own_notes"
  on viberide.notes
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Authenticated users can insert their own notes
create policy "authenticated_insert_own_notes"
  on viberide.notes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Authenticated users can update their own notes
create policy "authenticated_update_own_notes"
  on viberide.notes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Authenticated users can delete their own notes
-- Note: This typically sets deleted_at rather than hard delete
create policy "authenticated_delete_own_notes"
  on viberide.notes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger: Auto-update updated_at timestamp
create trigger set_timestamp_notes
  before update on viberide.notes
  for each row
  execute function viberide.set_timestamp();

-- ============================================================================
-- 6. Create itineraries table
-- ============================================================================

-- Stores AI-generated itineraries with versioning and status tracking
-- Each note can have multiple itinerary versions
create table viberide.itineraries (
  itinerary_id uuid primary key default gen_random_uuid(),
  note_id uuid not null references viberide.notes(note_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null,
  status viberide.itinerary_status not null default 'pending',
  summary_json jsonb not null,
  gpx_metadata jsonb,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Add comments for documentation
comment on table viberide.itineraries is 'AI-generated trip itineraries with versioning. Each note can have multiple versions.';
comment on column viberide.itineraries.version is 'Version number for this itinerary (increments per note)';
comment on column viberide.itineraries.status is 'Current status of itinerary generation';
comment on column viberide.itineraries.summary_json is 'Complete AI-generated itinerary in JSON format';
comment on column viberide.itineraries.gpx_metadata is 'Metadata for GPX file generation (waypoints, routes, etc.)';
comment on column viberide.itineraries.request_id is 'Unique identifier for the generation request (idempotency key)';
comment on column viberide.itineraries.deleted_at is 'Timestamp when itinerary was deleted (soft delete)';

-- Unique constraint: Each note can only have one itinerary per version number
create unique index idx_itineraries_unique_note_version
  on viberide.itineraries(note_id, version);

-- Unique constraint: Each user can only have one request_id (prevents duplicate requests)
create unique index idx_itineraries_unique_user_request
  on viberide.itineraries(user_id, request_id);

-- Partial unique constraint: Only one running itinerary per user (concurrency control)
-- This prevents users from generating multiple itineraries simultaneously
create unique index idx_itineraries_unique_user_running
  on viberide.itineraries(user_id)
  where status = 'running';

-- Index: Fetch all itineraries for a specific note
create index idx_itineraries_note
  on viberide.itineraries(note_id);

-- Index: Support the partial unique constraint on running status
create index idx_itineraries_user_status
  on viberide.itineraries(user_id, status)
  where status = 'running';

-- Enable RLS on itineraries
alter table viberide.itineraries enable row level security;

-- RLS Policy: Allow service role full access for backend operations
create policy "service_role_full_access_itineraries"
  on viberide.itineraries
  for all
  using (auth.role() = 'service_role');

-- RLS Policy: Authenticated users can select their own itineraries
create policy "authenticated_select_own_itineraries"
  on viberide.itineraries
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Authenticated users can insert their own itineraries
create policy "authenticated_insert_own_itineraries"
  on viberide.itineraries
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Authenticated users can update their own itineraries
create policy "authenticated_update_own_itineraries"
  on viberide.itineraries
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Authenticated users can delete their own itineraries
create policy "authenticated_delete_own_itineraries"
  on viberide.itineraries
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger: Auto-update updated_at timestamp
create trigger set_timestamp_itineraries
  before update on viberide.itineraries
  for each row
  execute function viberide.set_timestamp();

-- ============================================================================
-- 7. Create trigger for cascading soft deletes
-- ============================================================================

-- When a note is soft-deleted, automatically soft-delete all associated itineraries
-- This maintains referential integrity for soft deletes
create or replace function viberide.cascade_soft_delete_itineraries()
returns trigger as $$
begin
  -- Only cascade if the note is being soft-deleted (deleted_at is being set)
  if new.deleted_at is not null and old.deleted_at is null then
    update viberide.itineraries
    set deleted_at = new.deleted_at
    where note_id = new.note_id
      and deleted_at is null;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger: Cascade soft deletes from notes to itineraries
create trigger cascade_soft_delete_itineraries
  after update on viberide.notes
  for each row
  when (new.deleted_at is not null and old.deleted_at is null)
  execute function viberide.cascade_soft_delete_itineraries();

-- ============================================================================
-- 8. Create materialized view for latest itineraries
-- ============================================================================

-- Provides quick access to the most recent itinerary for each note
-- Useful for dashboard views and listing pages
create materialized view viberide.latest_itinerary as
select distinct on (note_id)
  itinerary_id,
  note_id,
  user_id,
  version,
  status,
  summary_json,
  gpx_metadata,
  request_id,
  created_at,
  updated_at,
  deleted_at
from viberide.itineraries
where deleted_at is null
order by note_id, version desc;

-- Add comment for documentation
comment on materialized view viberide.latest_itinerary is 'Shows only the latest (highest version) non-deleted itinerary for each note. Refresh periodically.';

-- Index on the materialized view for fast lookups
create unique index idx_latest_itinerary_note
  on viberide.latest_itinerary(note_id);

create index idx_latest_itinerary_user
  on viberide.latest_itinerary(user_id);

-- ============================================================================
-- 9. Create function to refresh the materialized view
-- ============================================================================

-- Helper function to refresh the latest_itinerary materialized view
-- This should be called after itinerary updates or periodically via a cron job
create or replace function viberide.refresh_latest_itinerary()
returns void as $$
begin
  refresh materialized view concurrently viberide.latest_itinerary;
end;
$$ language plpgsql security definer;

-- Add comment for documentation
comment on function viberide.refresh_latest_itinerary is 'Refreshes the latest_itinerary materialized view. Call after itinerary changes or via scheduled job.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
--   ✓ Created viberide schema
--   ✓ Created 3 ENUM types (terrain, road_type, itinerary_status)
--   ✓ Created 3 tables (user_preferences, notes, itineraries)
--   ✓ Enabled RLS on all tables with granular policies
--   ✓ Created 7 indexes for performance optimization
--   ✓ Created triggers for automatic timestamp updates
--   ✓ Created trigger for cascading soft deletes
--   ✓ Created materialized view for latest itineraries
--   ✓ Created helper function to refresh materialized view
--
-- Next Steps:
--   1. Run: supabase db reset (in development)
--   2. Verify schema: supabase db diff
--   3. Create seed data if needed
--   4. Set up scheduled job to refresh materialized view
-- ============================================================================

