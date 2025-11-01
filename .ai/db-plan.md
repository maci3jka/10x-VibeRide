# VibeRide Database Schema (PostgreSQL)

All domain tables live in the dedicated `viberide` schema and reuse `auth.users.id` (UUID) from Supabase as the canonical `user_id`.

---

## 1. Tables

### 1.1 user_preferences

This table is managed by Supabase Auth.

| Column              | Type                        | Constraints                                      |
|---------------------|-----------------------------|--------------------------------------------------|
| user_id             | UUID                        | PK, FK → `auth.users(id)`                        |
| terrain             | terrain                     | NOT NULL                                         |
| road_type           | road_type                   | NOT NULL                                         |
| typical_duration_h  | NUMERIC(4,1)                | NOT NULL, CHECK (>0)                             |
| typical_distance_km | NUMERIC(6,1)                | NOT NULL, CHECK (>0)                             |
| created_at          | TIMESTAMPTZ                 | DEFAULT now()                                    |
| updated_at          | TIMESTAMPTZ                 | DEFAULT now()                                    |

> Trigger `set_timestamp` updates `updated_at` on row change.

---

### 1.2 notes
| Column              | Type                        | Constraints                                                   |
|---------------------|-----------------------------|---------------------------------------------------------------|
| note_id             | UUID                        | PK, DEFAULT `gen_random_uuid()`                               |
| user_id             | UUID                        | FK → `auth.users(id)`                                         |
| title               | VARCHAR(120)                | NOT NULL                                                     |
| note_text           | TEXT                        | NOT NULL, CHECK (char_length(note_text) ≤ 1500)               |
| trip_prefs          | JSONB                       | NOT NULL DEFAULT '{}'                                         |
| ai_summary          | JSONB                       |                                                               |
| distance_km         | NUMERIC(6,1)                | CHECK (distance_km > 0)                                        |
| duration_h          | NUMERIC(4,1)                | CHECK (duration_h > 0)                                         |
| terrain             | terrain                     |                                                               |
| road_type           | road_type                   |                                                               |
| search_vector       | TSVECTOR                    | GENERATED ALWAYS AS (to_tsvector('simple', note_text)) STORED |
| created_at          | TIMESTAMPTZ                 | DEFAULT now()                                                 |
| updated_at          | TIMESTAMPTZ                 | DEFAULT now()                                                 |
| archived_at         | TIMESTAMPTZ                 |                                                               |
| deleted_at          | TIMESTAMPTZ                 |                                                               |

> Unique `(user_id, title)` WHERE `deleted_at IS NULL`.

---

### 1.3 itineraries
| Column        | Type        | Constraints                                                   |
|---------------|------------|---------------------------------------------------------------|
| itinerary_id  | UUID        | PK, DEFAULT `gen_random_uuid()`                               |
| note_id       | UUID        | FK → `viberide.notes(note_id)`                                |
| user_id       | UUID        | FK → `auth.users(id)`                                         |
| version       | INT         | NOT NULL                                                     |
| status        | itinerary_status | NOT NULL DEFAULT 'pending'                               |
| summary_json  | JSONB       | NOT NULL                                                     |
| gpx_metadata  | JSONB       |                                                             |
| request_id    | UUID        | NOT NULL                                                     |
| created_at    | TIMESTAMPTZ | DEFAULT now()                                                |
| updated_at    | TIMESTAMPTZ | DEFAULT now()                                                |
| deleted_at    | TIMESTAMPTZ |                                                             |

Constraints:
- UNIQUE (note_id, version)
- UNIQUE (user_id, request_id)
- Partial UNIQUE (user_id) WHERE status = 'running'  — enforces single active generation per user.

---

### 1.4 ENUM Types
- `terrain`  — values: `{'paved', 'gravel', 'mixed'}`
- `road_type` — values: `{'scenic', 'twisty', 'highway'}`
- `itinerary_status` — values: `{'pending','running','completed','failed','cancelled'}`

---

## 2. Relationships
1. `auth.users 1--1 viberide.user_preferences`  (PK = FK)
2. `auth.users 1--✕ viberide.notes`  (user_id)
3. `viberide.notes 1--✕ viberide.itineraries`  (note_id)
4. `auth.users 1--✕ viberide.itineraries` via user_id (redundant but useful for RLS)

---

## 3. Indexes
| Table | Index | Purpose |
|-------|-------|---------|
| notes | `idx_notes_user_updated` on (user_id, updated_at DESC) | List notes per user by recency |
| notes | `idx_notes_search` GIN on (search_vector) | Full-text search |
| itineraries | `idx_itineraries_note` on (note_id) | Fetch itineraries per note |
| itineraries | `idx_itineraries_user_status` PARTIAL on (user_id) WHERE status='running' | Enforce concurrency |

*All PKs and UNIQUE constraints automatically create B-tree indexes.*

---

## 4. Row-Level Security (RLS)
Enable RLS on all `viberide` tables.

### Policy Templates
```sql
-- Allow table owners (supabase) full access
CREATE POLICY "allow_service_role" ON <table> FOR ALL USING ( auth.role() = 'service_role' );

-- Allow row owners
CREATE POLICY "user_is_owner" ON <table>
FOR ALL USING ( user_id = auth.uid() );
```

Additional Policies:
- For `notes` and `itineraries`, add `SELECT` policy to analytics role via a read-only view.

---

## 5. Additional Notes
- All timestamps use `TIMESTAMPTZ` with UTC default `now()`; trigger `set_timestamp` keeps `updated_at` fresh.
- Soft deletes use `deleted_at`; cascading trigger deletes associated itineraries when a note is soft-deleted.
- Denormalized generated columns `terrain` and `road_type` in `notes` allow efficient filtering without JSON extraction.
- A materialized view `latest_itinerary` shows only the latest itinerary per note for quick access.
