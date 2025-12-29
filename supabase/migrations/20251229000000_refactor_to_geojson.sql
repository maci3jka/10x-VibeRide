-- ============================================================================
-- Migration: Refactor Itineraries to Use GeoJSON as Primary Format
-- ============================================================================
-- Purpose: Replace summary_json and gpx_metadata with route_geojson as the
--          single source of truth for route geometry. GeoJSON becomes the
--          primary storage format, with GPX generated on-demand.
--
-- Changes:
--   - Drop columns: summary_json, gpx_metadata
--   - Add column: route_geojson (jsonb NOT NULL)
--   - Add columns: title, total_distance_km, total_duration_h (derived fields)
--   - Update materialized view to include new fields
--
-- Breaking Changes:
--   - This migration drops existing data in summary_json and gpx_metadata
--   - All existing itineraries will need to be regenerated
-- ============================================================================

-- ============================================================================
-- 1. Drop materialized view first (it depends on columns we're dropping)
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS viberide.latest_itinerary CASCADE;

-- ============================================================================
-- 2. Drop existing itineraries (clean slate approach)
-- ============================================================================
-- Since we're changing the data structure fundamentally, we'll truncate
-- the itineraries table to avoid data inconsistencies
TRUNCATE TABLE viberide.itineraries CASCADE;

-- ============================================================================
-- 3. Modify itineraries table structure
-- ============================================================================

-- Drop old columns
ALTER TABLE viberide.itineraries
  DROP COLUMN IF EXISTS summary_json,
  DROP COLUMN IF EXISTS gpx_metadata;

-- Add new GeoJSON column (NOT NULL)
ALTER TABLE viberide.itineraries
  ADD COLUMN route_geojson jsonb NOT NULL DEFAULT '{
    "type": "FeatureCollection",
    "features": []
  }'::jsonb;

-- Add derived fields for fast listing (duplicated from GeoJSON properties)
ALTER TABLE viberide.itineraries
  ADD COLUMN title text,
  ADD COLUMN total_distance_km numeric(9,1),
  ADD COLUMN total_duration_h numeric(7,1);

-- Add comments for documentation
COMMENT ON COLUMN viberide.itineraries.route_geojson IS 'GeoJSON FeatureCollection containing route geometry (LineStrings) and optional waypoints (Points). Single source of truth for route data.';
COMMENT ON COLUMN viberide.itineraries.title IS 'Trip title extracted from route_geojson.properties.title for fast listing';
COMMENT ON COLUMN viberide.itineraries.total_distance_km IS 'Total distance extracted from route_geojson.properties.total_distance_km for fast listing';
COMMENT ON COLUMN viberide.itineraries.total_duration_h IS 'Total duration extracted from route_geojson.properties.total_duration_h for fast listing';

-- Remove default after adding column (force explicit values on insert)
ALTER TABLE viberide.itineraries
  ALTER COLUMN route_geojson DROP DEFAULT;

-- ============================================================================
-- 4. Add index for GeoJSON queries
-- ============================================================================

-- GIN index for JSONB queries on route_geojson
CREATE INDEX idx_itineraries_route_geojson
  ON viberide.itineraries USING gin(route_geojson);

-- Index for filtering by title
CREATE INDEX idx_itineraries_title
  ON viberide.itineraries(title)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. Recreate materialized view with new schema
-- ============================================================================

-- Recreate with new schema
CREATE MATERIALIZED VIEW viberide.latest_itinerary AS
SELECT DISTINCT ON (note_id)
  itinerary_id,
  note_id,
  user_id,
  version,
  status,
  route_geojson,
  title,
  total_distance_km,
  total_duration_h,
  request_id,
  created_at,
  updated_at,
  deleted_at
FROM viberide.itineraries
WHERE deleted_at IS NULL
ORDER BY note_id, version DESC;

-- Add comment for documentation
COMMENT ON MATERIALIZED VIEW viberide.latest_itinerary IS 'Shows only the latest (highest version) non-deleted itinerary for each note with GeoJSON data. Refresh periodically.';

-- Recreate indexes on the materialized view
CREATE UNIQUE INDEX idx_latest_itinerary_note
  ON viberide.latest_itinerary(note_id);

CREATE INDEX idx_latest_itinerary_user
  ON viberide.latest_itinerary(user_id);

-- ============================================================================
-- 6. Create validation function for GeoJSON structure
-- ============================================================================

-- Function to validate basic GeoJSON structure
CREATE OR REPLACE FUNCTION viberide.validate_route_geojson(geojson jsonb)
RETURNS boolean AS $$
BEGIN
  -- Check if it's a FeatureCollection
  IF (geojson->>'type') != 'FeatureCollection' THEN
    RETURN false;
  END IF;
  
  -- Check if features array exists
  IF NOT (geojson ? 'features') THEN
    RETURN false;
  END IF;
  
  -- Check if properties object exists with required fields
  IF NOT (geojson ? 'properties') THEN
    RETURN false;
  END IF;
  
  IF NOT (geojson->'properties' ? 'title') THEN
    RETURN false;
  END IF;
  
  IF NOT (geojson->'properties' ? 'total_distance_km') THEN
    RETURN false;
  END IF;
  
  IF NOT (geojson->'properties' ? 'total_duration_h') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION viberide.validate_route_geojson IS 'Validates that a JSONB value conforms to the expected GeoJSON FeatureCollection structure with required properties';

-- ============================================================================
-- 7. Add check constraint for GeoJSON validation
-- ============================================================================

-- Add constraint to ensure route_geojson is valid
ALTER TABLE viberide.itineraries
  ADD CONSTRAINT check_route_geojson_valid
  CHECK (viberide.validate_route_geojson(route_geojson));

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
--   ✓ Dropped materialized view (to allow column drops)
--   ✓ Truncated itineraries table (clean slate)
--   ✓ Dropped summary_json and gpx_metadata columns
--   ✓ Added route_geojson column (jsonb NOT NULL)
--   ✓ Added derived fields: title, total_distance_km, total_duration_h
--   ✓ Created GIN index for JSONB queries
--   ✓ Recreated materialized view with new schema
--   ✓ Created validation function for GeoJSON structure
--   ✓ Added check constraint for GeoJSON validation
--
-- Next Steps:
--   1. Update TypeScript types to reflect new schema
--   2. Implement geojsonService.ts for validation and conversion
--   3. Refactor itineraryService.ts to generate GeoJSON
--   4. Update API routes to use new schema
--   5. Create download endpoint for GPX/GeoJSON export
-- ============================================================================

