<conversation_summary>
<decisions>
1. Reuse Supabase auth.users.id (UUID) as primary key across domain tables.
2. Implement user_preferences as 1-to-1 table keyed by user_id.
3. Separate itineraries table with versioning history per note.
4. Do not store GPX blobs; only stream and record metadata.
5. Enforce single concurrent generation using status ENUM with partial unique index (user_id where status='running').
6. Store per-note preference overrides in trip_prefs JSONB, only overriding keys.
7. Skip OpenAI cost tracking table for MVP; cost handled externally.
8. Add performance indexes on notes.updated_at DESC, notes.user_id, itineraries.note_id; GIN FTS index on note_text.
9. Postpone table partitioning until post-MVP.
10. Apply strict RLS: users see own rows; analytics role via read-only views.
11. Use ENUM types for terrain and road_type.
12. Add created_at/updated_at timestamps with trigger to auto-update.
13. Add optional title column with generated fallback; VARCHAR(120) limit.
14. summary_json stored as JSONB validated against JSON Schema.
15. Soft delete strategy with deleted_at; cascade to itineraries via trigger.
16. Unique index on (user_id, title) excluding deleted rows.
17. UUID primary keys using gen_random_uuid().
18. Numeric fields distance_km NUMERIC(6,1) and duration_hours NUMERIC(4,1) positive values only.
19. Separate viberide schema for domain tables.
20. Manual purge function for soft-deleted rows (called on demand).
21. Generated search_vector column with combined user_id GIN index.
22. Auto-increment version trigger on itineraries; composite unique (note_id, version).
23. Extend status ENUM with cancelled.
24. View and materialized view for latest itinerary per note.
25. Partial indexes on active rows (deleted_at IS NULL).
26. archived_at column to allow archiving notes.
27. Generated terrain/road_type columns in notes for denormalization.
28. Compound BTREE index (user_id, title_search, updated_at DESC).
29. Unique (user_id, request_id) to ensure idempotent itinerary creation.
30. v_enums view exposing ENUM values to clients.
</decisions>

<matched_recommendations>
1. Use auth.users.id as PK across tables.
2. Dedicated user_preferences table keyed by user_id.
3. Separate itineraries table with version column.
4. Stream GPX only; store metadata.
5. status ENUM with partial unique index to enforce single generation.
6. trip_prefs JSONB storing overrides only.
7. Skip openai_usage table for MVP.
8. Indexing strategy on notes, itineraries, and FTS GIN.
9. RLS policies per table and analytics view role.
10. ENUM types for terrain and road_type.
11. Timestamps via triggers.
12. Title column with limit + generated fallback.
13. summary_json as JSONB with schema validation.
14. Soft deletes with deleted_at; cascading trigger.
15. Unique constraints (user_id,title) (note_id,version).
16. UUID PK using gen_random_uuid().
17. Numeric field data types and positive CHECKs.
18. viberide schema separation.
19. On-demand purge function.
20. search_vector + GIN multicolumn index.
21. Auto version trigger.
22. status ENUM include cancelled.
23. Partial index on deleted_at NULL.
24. archived_at flag.
25. Denormalized generated columns for terrain, road_type.
26. Compound index user_title_updated.
27. Unique (user_id,request_id) for idempotency.
28. View v_enums for ENUM values.
</matched_recommendations>
</conversation_summary>
