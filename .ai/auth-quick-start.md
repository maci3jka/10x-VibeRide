# Authentication Quick Start Guide

## Development Mode (DEVENV)

### Enable Development Mode

Set environment variable to bypass authentication:

```bash
# .env
DEVENV=true
```

**Behavior:**
- All authentication checks are bypassed
- Default user ID used: `00000000-0000-0000-0000-000000000001`
- Default email: `dev@viberide.local`
- All protected routes are accessible
- No Google OAuth required

**Note:** The middleware uses `process.env.DEVENV` (server-side), not `import.meta.env.DEVENV`. This is because Astro only exposes `PUBLIC_` prefixed variables to `import.meta.env`.

### Disable Development Mode (Production)

```bash
# .env
DEVENV=false
# or simply omit/comment out the variable
```

**Alternative:** Run with command-line override:
```bash
DEVENV=false npm run dev
```

## Production Setup

### 1. Configure Supabase

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### 2. Enable Google OAuth in Supabase Dashboard

1. Go to Authentication > Providers
2. Enable Google
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Configure redirect URL: `{APP_URL}/auth/callback`

### 3. Configure Google Cloud Console

1. Create OAuth 2.0 Client ID
2. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `{APP_URL}/auth/callback`
3. Enable required APIs (Google+ API if needed)

## Using Authentication in Your Code

### Protect a Route

```astro
---
// src/pages/my-protected-page.astro

// Check authentication
if (!Astro.locals.user) {
  // Preserve intended destination (US-014)
  const returnTo = encodeURIComponent(Astro.url.pathname + Astro.url.search);
  return Astro.redirect(`/?returnTo=${returnTo}`);
}

// Access user data
const user = Astro.locals.user;
// user.id: string
// user.email: string | null
---

<Layout title="Protected Page">
  <p>Welcome, {user.email}!</p>
</Layout>
```

### Protect an API Endpoint

```typescript
// src/pages/api/my-endpoint.ts
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  // Check authentication
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        error: "unauthorized",
        message: "Please sign in to continue.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Access user data
  const userId = locals.user.id;
  
  // Use Supabase client from locals (not imported directly)
  const { data, error } = await locals.supabase
    .from("my_table")
    .select("*")
    .eq("user_id", userId);

  // Return response
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

### Use Auth in React Components

```tsx
// Client-side authentication check
import { supabaseClient } from "@/db/supabase.client";
import { useEffect, useState } from "react";

export function MyComponent() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return <p>Please sign in</p>;
  }

  return <p>Welcome, {user.email}!</p>;
}
```

### Sign Out from React Component

```tsx
import { toast } from "sonner";

async function handleSignOut() {
  try {
    const response = await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Sign out failed");
    }

    toast.success("You have been signed out.");
    window.location.href = "/";
  } catch (err) {
    toast.error("Sign out failed. Please try again.");
  }
}
```

## Testing Authentication

### Test Sign-In Flow

1. Start dev server: `npm run dev`
2. Visit `http://localhost:4321`
3. Click "Sign in with Google"
4. Complete Google OAuth flow
5. Should redirect to `/profile` (new user) or `/notes` (existing user)

### Test Protected Routes

1. Visit `http://localhost:4321/profile` without signing in
2. Should redirect to `/?returnTo=/profile`
3. Sign in with Google
4. Should return to `/profile` after authentication

### Test Sign-Out

1. Sign in first
2. Navigate to profile page
3. Click sign-out button (when implemented)
4. Should redirect to landing page
5. Verify session is cleared (try accessing protected route)

### Test Development Mode

1. Set `DEVENV=true` in `.env`
2. Restart dev server
3. Visit any protected route directly
4. Should be accessible without sign-in
5. Check `Astro.locals.user` - should show default user

## Troubleshooting

### "Missing Supabase environment variables" Error

**Problem:** Application crashes on startup

**Solution:** Add `SUPABASE_URL` and `SUPABASE_KEY` to `.env` file

### OAuth Redirect Loop

**Problem:** Stuck in redirect loop after sign-in

**Solution:** 
- Check callback URL matches in Supabase and Google Cloud Console
- Verify `{APP_URL}/auth/callback` is correct
- Check browser console for errors

### "No active session" Error

**Problem:** Authenticated user sees "Please sign in" message

**Solution:**
- Check cookies are enabled in browser
- Verify Supabase credentials are correct
- Check middleware is running (see server logs)
- Try clearing browser cookies and signing in again

### Development Mode Not Working

**Problem:** Still prompted to sign in with `DEVENV=true`

**Solution:**
- Verify `.env` file is in project root
- Restart dev server after changing `.env`
- Check `import.meta.env.DEVENV` in middleware
- Ensure no typos in environment variable name

### Protected Route Redirects to Wrong Page

**Problem:** After sign-in, not redirected to intended page

**Solution:**
- Check `returnTo` parameter in URL
- Verify OAuth callback preserves `returnTo` parameter
- Check URL encoding/decoding is correct

## Common Patterns

### Conditional Rendering Based on Auth

```astro
---
const user = Astro.locals.user;
---

<Layout>
  {user ? (
    <p>Welcome back, {user.email}!</p>
  ) : (
    <p>Please sign in to continue</p>
  )}
</Layout>
```

### Redirect After Action

```typescript
// After creating a note, redirect to notes list
return Astro.redirect("/notes");

// After updating profile, redirect with success message
return Astro.redirect("/profile?success=true");
```

### Show Toast Notifications

```tsx
import { toast } from "sonner";

// Success message
toast.success("Profile saved successfully!");

// Error message
toast.error("Failed to save profile. Please try again.");

// Info message
toast.info("Your session will expire in 5 minutes.");

// Warning message
toast.warning("Please complete your profile before continuing.");
```

## Security Best Practices

1. **Never expose Supabase service role key** - Use anon key only
2. **Always validate user input** - Use Zod schemas for validation
3. **Use RLS policies** - Enforce data access at database level
4. **Check authentication in every protected route** - Don't rely on middleware alone
5. **Use HTTPS in production** - Required for secure cookies
6. **Disable DEVENV in production** - Add environment validation
7. **Log auth events** - Track sign-ins, sign-outs, and failures
8. **Handle session expiration** - Implement 401 handling in API routes

## Next Steps

1. Implement sign-out button in ProfileScreen component
2. Create SignOutDialog for confirmation
3. Add session expiration handling in API routes
4. Implement analytics logging for auth events
5. Add tests for authentication flows

