# DEVENV Environment Variable Fix

## Issue

The `DEVENV` environment variable was not being read correctly in the middleware, causing reversed authentication behavior:
- ❌ With `DEVENV=true` → Authentication was **required** (wrong)
- ✅ Without `DEVENV` → Authentication was **bypassed** (wrong)

## Root Cause

**Astro's environment variable system:**
- `import.meta.env` only exposes variables prefixed with `PUBLIC_`
- Server-side code (middleware, API routes) should use `process.env` instead
- The middleware was checking `import.meta.env.DEVENV` which was always `undefined`

## Solution

Changed all server-side environment variable access from `import.meta.env` to `process.env`:

### 1. Middleware (`src/middleware/index.ts`)

**Before:**
```typescript
const isDev = import.meta.env.DEVENV === "true";
```

**After:**
```typescript
const isDev = process.env.DEVENV === "true";
```

### 2. Supabase Client (`src/db/supabase.client.ts`)

**Before:**
```typescript
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
```

**After:**
```typescript
const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY || process.env.SUPABASE_KEY;
```

## How to Use

### Development Mode (Bypass Auth)

**Option 1: Using .env file (Recommended)**
```bash
# .env
DEVENV=true
```

Then run:
```bash
npm run dev
```

**Option 2: Command line**
```bash
DEVENV=true npm run dev
```

### Production Mode (Require Auth)

**Option 1: Remove from .env**
```bash
# .env
# DEVENV=true  <- Comment out or remove
```

**Option 2: Set to false**
```bash
# .env
DEVENV=false
```

**Option 3: Command line override**
```bash
DEVENV=false npm run dev
```

## Expected Behavior (After Fix)

### With `DEVENV=true`
- ✅ Authentication bypassed
- ✅ Default user used (`00000000-0000-0000-0000-000000000001`)
- ✅ All protected routes accessible
- ✅ No OAuth required

### Without `DEVENV` or `DEVENV=false`
- ✅ Authentication required
- ✅ Unauthenticated users redirected to landing page
- ✅ OAuth flow required for access
- ✅ Protected routes check for valid session

## Testing

1. **Test Development Mode:**
   ```bash
   # Ensure DEVENV=true in .env
   npm run dev
   # Visit http://localhost:4321/profile
   # Should be accessible without login
   ```

2. **Test Production Mode:**
   ```bash
   # Remove or comment out DEVENV in .env
   npm run dev
   # Visit http://localhost:4321/profile
   # Should redirect to landing page (/)
   ```

## Technical Details

### Astro Environment Variables

**Client-side (Browser):**
- Only `PUBLIC_` prefixed variables are available
- Access via `import.meta.env.PUBLIC_*`

**Server-side (Middleware, API Routes, Astro Pages):**
- All environment variables available via `process.env`
- `PUBLIC_` prefixed variables also available via `import.meta.env`
- Non-prefixed variables only via `process.env`

### Why This Matters

The middleware runs **server-side** during SSR, so:
- `import.meta.env.DEVENV` → `undefined` (not prefixed with PUBLIC_)
- `process.env.DEVENV` → `"true"` (from .env file)

## Files Modified

1. `src/middleware/index.ts` - Changed to use `process.env.DEVENV`
2. `src/db/supabase.client.ts` - Added fallback to `process.env` for Supabase credentials

## Additional Notes

- The fix maintains backward compatibility
- Works with both `.env` file and command-line environment variables
- No changes needed to other parts of the codebase
- Client-side code (React components) can still use `import.meta.env` for `PUBLIC_` variables

