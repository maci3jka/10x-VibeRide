# User Preferences API Testing Guide

## Prerequisites

1. **Ensure Supabase is running:**
   ```bash
   npx supabase start
   ```

2. **Start the development server with DEVENV enabled:**
   ```bash
   DEVENV=true npm run dev
   ```

## Quick Test with cURL

### 1. Create Preferences (First Time - 201 Created)

```bash
curl -X PUT http://localhost:4321/api/user/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "terrain": "paved",
    "road_type": "twisty",
    "typical_duration_h": 3.5,
    "typical_distance_km": 250.0
  }'
```

### 2. Get Preferences (200 OK)

```bash
curl -X GET http://localhost:4321/api/user/preferences \
  -H "Content-Type: application/json"
```

### 3. Update Preferences (200 OK)

```bash
curl -X PUT http://localhost:4321/api/user/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "terrain": "mixed",
    "road_type": "scenic",
    "typical_duration_h": 5.0,
    "typical_distance_km": 400.5
  }'
```

## Validation Tests

### Invalid Terrain (400 Bad Request)

```bash
curl -X PUT http://localhost:4321/api/user/preferences \
  -H "Content-Type: application/json" \
  -d '{"terrain": "invalid", "road_type": "twisty", "typical_duration_h": 3.5, "typical_distance_km": 250.0}'
```

### Negative Duration (400 Bad Request)

```bash
curl -X PUT http://localhost:4321/api/user/preferences \
  -H "Content-Type: application/json" \
  -d '{"terrain": "paved", "road_type": "twisty", "typical_duration_h": -1.0, "typical_distance_km": 250.0}'
```

### Missing Field (400 Bad Request)

```bash
curl -X PUT http://localhost:4321/api/user/preferences \
  -H "Content-Type: application/json" \
  -d '{"terrain": "paved", "road_type": "twisty", "typical_distance_km": 250.0}'
```

## Expected Behaviors

- **First PUT**: Returns 201 Created with `created_at === updated_at`
- **Subsequent PUTs**: Returns 200 OK with `updated_at > created_at`
- **GET without data**: Returns 404 Not Found
- **GET with data**: Returns 200 OK
- **Invalid data**: Returns 400 Bad Request with field-specific errors
- **No auth in production**: Returns 401 Unauthorized

## Database Verification

Check the data directly in Supabase:

```bash
npx supabase db --db-url postgres://postgres:postgres@localhost:54322/postgres -c "SELECT * FROM viberide.user_preferences;"
```

