# Authentication System Specification for VibeRide

## Document Overview

This specification defines the complete authentication architecture for VibeRide, covering user registration, login, logout, and account recovery functionality. The system leverages Supabase Auth integrated with Astro 5 server-side rendering, maintaining compatibility with existing application behavior defined in the PRD, API plan, database schema, and UI architecture.

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Overview

The authentication UI extends the existing Landing page and introduces new authentication-specific pages while maintaining the established pattern of authenticated vs. unauthenticated layouts. All authentication flows are designed to be mobile-first, accessible (WCAG-compliant), and consistent with the existing Shadcn/ui component library.

### 1.2 Page Structure and Components

#### 1.2.1 Landing Page (Extended) - `/`

**Current State:**
- Path: `/`
- Purpose: Marketing blurb & Google sign-in CTA
- Components: HeroSection, GoogleSignInButton, Footer

**Extended Functionality:**
- Add authentication state detection
- Add "Already signed in" redirect logic
- Add error message display for OAuth failures
- Add loading state during OAuth redirect

**New Components:**
```
- AuthErrorBanner (React)
  - Props: error: string | null, onDismiss: () => void
  - Displays OAuth errors returned from Supabase callback
  - Auto-dismisses after 10 seconds
  - Accessible with role="alert" and aria-live="assertive"

- GoogleSignInButton (Extended)
  - Add loading state (spinner + "Signing in..." text)
  - Add disabled state during OAuth flow
  - Add error handling for network failures
  - Keyboard accessible (Enter/Space triggers)
  - ARIA label: "Sign in with Google account"
```

**Layout:**
- Uses: `src/layouts/Layout.astro` (unauthenticated variant)
- No TabBar component
- Full-width hero section
- Footer with Privacy Policy and Terms links

**Validation & Error Handling:**
- Display OAuth errors from URL query params (`?error=...`)
- Network timeout errors (15s) show retry button
- Invalid OAuth state errors redirect to landing with message

**Key Scenarios:**
1. **First-time visitor**: Sees hero + sign-in button
2. **OAuth error return**: Sees error banner above hero
3. **Already authenticated**: Middleware redirects to `/notes` or `/profile`
4. **Network failure**: Shows retry button with countdown

---

#### 1.2.2 OAuth Callback Handler - `/auth/callback`

**Purpose:**
- Receives OAuth callback from Google via Supabase
- Exchanges authorization code for session
- Redirects to appropriate post-login destination

**Implementation:**
- Astro page with server-side logic only (no UI)
- Path: `src/pages/auth/callback.astro`
- Server-side rendering (SSR) required

**Components:**
- No client-side components
- Minimal loading page with spinner (shown briefly during redirect)

**Flow:**
1. Receive `code` and `state` query parameters
2. Call `supabase.auth.exchangeCodeForSession(code)`
3. On success:
   - Check if user preferences exist
   - Redirect to `/profile` if incomplete (US-002)
   - Redirect to `/notes` if complete
4. On failure:
   - Log error server-side
   - Redirect to `/?error=auth_failed`

**Error Handling:**
- Invalid code: Redirect to `/?error=invalid_code`
- Expired code: Redirect to `/?error=expired_code`
- State mismatch: Redirect to `/?error=invalid_state`
- Network error: Redirect to `/?error=network_error`

---

#### 1.2.3 Sign Out Confirmation - Component within authenticated pages

**Purpose:**
- Confirm user intent to sign out
- Prevent accidental sign-outs

**Implementation:**
- Modal dialog component (Shadcn Dialog)
- Triggered from Profile page or TabBar avatar menu

**Component:**
```
- SignOutDialog (React)
  - Props: open: boolean, onOpenChange: (open: boolean) => void
  - Displays confirmation message
  - Two buttons: "Cancel" (secondary) and "Sign Out" (destructive)
  - Keyboard navigation (Tab, Escape to close)
  - Focus trap within dialog
  - ARIA role="alertdialog"
```

**Validation & Error Handling:**
- Sign-out API call failure shows toast: "Sign out failed. Please try again."
- Network timeout (15s) shows retry option
- Successful sign-out clears session and redirects to `/`

**Key Scenarios:**
1. **User clicks Sign Out**: Dialog opens
2. **User confirms**: Session cleared, redirect to landing
3. **User cancels**: Dialog closes, stays on current page
4. **Network failure**: Toast with retry button

---

#### 1.2.4 Password Recovery (Deferred for MVP)

**Note:** The PRD specifies Google OAuth as the primary authentication method. Password-based authentication and recovery are out of scope for MVP. However, the architecture should support future extension.

**Future Implementation Considerations:**
- Path: `/auth/reset-password`
- Components: PasswordResetForm, EmailSentConfirmation
- Flow: Email input → Supabase magic link → Password reset page

---

### 1.3 Component Separation: Astro vs. React

#### 1.3.1 Astro Pages (Server-Side)

**Responsibilities:**
- Initial page rendering with server-side data
- Session validation via middleware
- Redirect logic based on authentication state
- SEO metadata and static content

**Files:**
```
src/pages/index.astro           - Landing page (unauthenticated)
src/pages/auth/callback.astro   - OAuth callback handler
src/pages/notes.astro           - Notes list (authenticated, existing)
src/pages/profile.astro         - Profile page (authenticated, existing)
src/pages/generate.astro        - Generate page (authenticated, future)
```

**Pattern:**
```astro
---
// Server-side logic
const user = Astro.locals.user;
if (!user && requiresAuth) {
  return Astro.redirect('/');
}
---
<Layout>
  <ClientComponent user={user} />
</Layout>
```

#### 1.3.2 React Components (Client-Side)

**Responsibilities:**
- Interactive forms and buttons
- Client-side validation
- Optimistic UI updates
- State management (loading, errors)
- API calls to backend endpoints

**Files:**
```
src/components/GoogleSignInButton.tsx    - Sign-in button with loading state
src/components/AuthErrorBanner.tsx       - OAuth error display
src/components/SignOutDialog.tsx         - Sign-out confirmation modal
src/components/TabBar.tsx                - Extended with sign-out option
src/components/ProfileScreen.tsx         - Extended with sign-out button
```

**Pattern:**
```tsx
export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (err) {
      setError('Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button onClick={handleSignIn} disabled={loading}>
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}
```

---

### 1.4 Validation Cases and Error Messages

#### 1.4.1 Client-Side Validation

**Google Sign-In Button:**
- **Disabled state**: Button disabled during OAuth flow
- **Network check**: Verify `navigator.onLine` before initiating OAuth
- **Error message**: "No internet connection. Please check your network."

**Sign-Out Dialog:**
- **Confirmation required**: User must explicitly click "Sign Out"
- **Error message**: "Sign out failed. Please try again."

#### 1.4.2 Server-Side Validation

**OAuth Callback:**
- **Missing code**: Redirect to `/?error=missing_code`
- **Invalid code**: Redirect to `/?error=invalid_code`
- **Expired code**: Redirect to `/?error=expired_code`
- **PKCE validation failure**: Handled automatically by Supabase, returns as `auth_failed`

**Session Validation (Middleware):**
- **No session**: Redirect to `/` for protected routes
- **Expired session**: Attempt refresh, redirect to `/` if fails
- **Invalid token**: Clear session, redirect to `/`

#### 1.4.3 Error Message Mapping

| Error Code | User-Facing Message | Action |
|------------|---------------------|--------|
| `auth_failed` | "Sign in failed. Please try again." | Retry button |
| `invalid_code` | "Invalid authentication code. Please sign in again." | Sign in button |
| `expired_code` | "Your sign-in link has expired. Please sign in again." | Sign in button |
| `network_error` | "Network error. Please check your connection and try again." | Retry button |
| `session_expired` | "Your session has expired. Please sign in again." | Sign in button |
| `signout_failed` | "Sign out failed. Please try again." | Retry button |

---

### 1.5 Key User Scenarios

#### 1.5.1 Scenario: First-Time User Registration

**Flow:**
1. User visits `/` (Landing page)
2. Clicks "Sign in with Google" button
3. Button shows loading state ("Signing in...")
4. Redirected to Google OAuth consent screen
5. User grants permissions
6. Google redirects to `/auth/callback?code=...`
7. Callback page exchanges code for session
8. Server checks for user preferences (none exist)
9. Redirected to `/profile` with toast: "Welcome! Please complete your riding preferences."
10. User fills out PreferencesForm (terrain, road type, duration, distance)
11. Clicks "Save" button
12. On success, redirected to `/notes` with toast: "Profile saved successfully!"

**Error Paths:**
- OAuth denied: Return to `/` with message "Sign in was cancelled."
- Network failure during OAuth: Show retry button
- Profile save failure: Show validation errors inline

#### 1.5.2 Scenario: Returning User Login

**Flow:**
1. User visits `/` (Landing page)
2. Clicks "Sign in with Google" button
3. Button shows loading state
4. Redirected to Google (may auto-approve if previously consented)
5. Google redirects to `/auth/callback?code=...`
6. Callback page exchanges code for session
7. Server checks for user preferences (exist and complete)
8. Redirected to `/notes` with toast: "Welcome back!"
9. User sees their existing notes list

**Error Paths:**
- Session expired during browsing: Middleware catches 401, shows toast, redirects to `/`
- Network failure: Offline banner appears, retry when online

#### 1.5.3 Scenario: User Sign-Out

**Flow:**
1. User is on any authenticated page (e.g., `/profile`)
2. Clicks "Sign Out" button in TabBar avatar menu
3. SignOutDialog modal opens
4. User clicks "Sign Out" (destructive button)
5. Client calls `/api/auth/signout` endpoint
6. Server clears session cookie
7. Client redirects to `/` with toast: "You have been signed out."
8. Landing page displays

**Error Paths:**
- Sign-out API failure: Toast "Sign out failed. Please try again." with retry
- Network timeout: Toast with retry button

#### 1.5.4 Scenario: Session Expiration During Use

**Flow:**
1. User is browsing `/notes` (authenticated)
2. Session expires (Supabase default: 1 hour)
3. User clicks "Generate" for a note
4. API call to `/api/notes/:id/itineraries` returns 401
5. Client-side error handler intercepts 401 response
6. Toast appears: "Your session has expired. Please sign in again."
7. User redirected to `/` after 3 seconds
8. User clicks "Sign in with Google" to resume

**Error Paths:**
- Multiple 401s during redirect: Prevent redirect loop with sessionStorage flag
- Session refresh fails: Clear session, redirect to `/`

**Note:** Middleware does not intercept API responses; 401 handling occurs in client-side HTTP utility (`src/lib/http.ts`).

#### 1.5.5 Scenario: Concurrent Session Management

**Flow:**
1. User signs in on Device A (desktop)
2. User signs in on Device B (mobile)
3. Both sessions remain valid (Supabase supports multiple sessions)
4. User signs out on Device A
5. Device B session remains active (independent sessions)

**Note:** Supabase Auth supports multiple concurrent sessions by default. No additional logic required for MVP.

---

### 1.6 Authenticated vs. Unauthenticated Layout Behavior

#### 1.6.1 Unauthenticated Layout

**Applied to:**
- `/` (Landing page)
- `/auth/callback` (briefly, during redirect)

**Characteristics:**
- No TabBar component
- No user avatar or profile menu
- Full-width hero section
- Footer with Privacy Policy and Terms links
- No access to protected routes

**Layout File:**
```astro
<!-- src/layouts/Layout.astro -->
---
const { title, showTabBar = false } = Astro.props;
---
<html>
  <head>
    <title>{title} | VibeRide</title>
  </head>
  <body>
    <slot />
    {showTabBar && <TabBar />}
  </body>
</html>
```

#### 1.6.2 Authenticated Layout

**Applied to:**
- `/notes` (Notes list)
- `/notes/:id` (Note editor)
- `/generate` (Itinerary generation)
- `/profile` (User profile)

**Characteristics:**
- Persistent TabBar (bottom on mobile, floating pill on desktop)
- User avatar in TabBar with dropdown menu (Profile, Sign Out)
- Access to all protected routes
- Session refresh listener active
- Offline banner when network unavailable

**Layout File:**
```astro
<!-- src/layouts/AuthenticatedLayout.astro -->
---
import TabBar from '../components/TabBar.tsx';
import OfflineBanner from '../components/OfflineBanner.tsx';

const user = Astro.locals.user;
if (!user) {
  return Astro.redirect('/');
}
---
<Layout title={title} showTabBar={true}>
  <OfflineBanner client:load />
  <main>
    <slot />
  </main>
  <TabBar user={user} client:load />
</Layout>
```

---

### 1.7 Extended Components with Authentication

#### 1.7.1 TabBar Component (Extended)

**Current Functionality:**
- Navigation between Notes, Generate, Profile tabs
- 48px tap targets
- Icons + labels
- Active state highlighting

**Extended Functionality:**
```tsx
// src/components/TabBar.tsx

interface TabBarProps {
  user: { id: string; email: string | null };
}

export function TabBar({ user }: TabBarProps) {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  return (
    <nav role="navigation" aria-label="Main navigation">
      {/* Existing tabs: Notes, Generate, Profile */}
      <TabButton href="/notes" icon={<NotesIcon />} label="Notes" />
      <TabButton href="/generate" icon={<GenerateIcon />} label="Generate" />
      <TabButton href="/profile" icon={<ProfileIcon />} label="Profile" />
      
      {/* New: User avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setShowSignOutDialog(true)}>
            <LogOutIcon /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog 
        open={showSignOutDialog} 
        onOpenChange={setShowSignOutDialog} 
      />
    </nav>
  );
}
```

**Accessibility:**
- Avatar button: `aria-label="User menu"`
- Dropdown menu: `role="menu"`, keyboard navigation
- Sign out option: `role="menuitem"`

#### 1.7.2 ProfileScreen Component (Extended)

**Current Functionality:**
- PreferencesForm for terrain, road type, duration, distance
- Save button with optimistic updates
- Conflict resolution dialog

**Extended Functionality:**
```tsx
// src/components/ProfileScreen.tsx

export function ProfileScreen({ user }: { user: User }) {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  return (
    <div className="profile-container">
      <header>
        <h1>Profile</h1>
        <p>Signed in as {user.email}</p>
      </header>

      <PreferencesForm />
      
      {/* New: Sign out section */}
      <section className="account-section">
        <h2>Account</h2>
        <Button 
          variant="destructive" 
          onClick={() => setShowSignOutDialog(true)}
        >
          Sign Out
        </Button>
      </section>

      <SignOutDialog 
        open={showSignOutDialog} 
        onOpenChange={setShowSignOutDialog} 
      />
    </div>
  );
}
```

---

## 2. BACKEND LOGIC

### 2.1 API Endpoints

#### 2.1.1 Sign Out Endpoint

**Method:** `POST`  
**Path:** `/api/auth/signout`  
**Description:** Clears user session and signs out from Supabase  
**Auth:** Required (must have active session)

**Request:**
- Headers: `Cookie: sb-access-token=...`
- Body: None

**Response (Success):**
```json
{
  "success": true,
  "message": "Signed out successfully"
}
```
**Status:** `200 OK`

**Response (Error):**
```json
{
  "error": "signout_failed",
  "message": "Failed to sign out. Please try again."
}
```
**Status:** `500 Internal Server Error`

**Implementation:**
```typescript
// src/pages/api/auth/signout.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, cookies }) => {
  const supabase = locals.supabase;

  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return new Response(
        JSON.stringify({
          error: 'signout_failed',
          message: 'Failed to sign out. Please try again.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clear all Supabase cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signed out successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message: 'An unexpected error occurred.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

#### 2.1.2 Session Status Endpoint (Optional)

**Method:** `GET`  
**Path:** `/api/auth/session`  
**Description:** Returns current session status  
**Auth:** Optional (returns null if not authenticated)

**Request:**
- Headers: `Cookie: sb-access-token=...`
- Body: None

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "expires_at": "2025-11-25T10:30:00Z"
}
```
**Status:** `200 OK`

**Response (Not Authenticated):**
```json
{
  "authenticated": false,
  "user": null
}
```
**Status:** `200 OK`

**Implementation:**
```typescript
// src/pages/api/auth/session.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          user: null
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email
        },
        expires_at: session.expires_at
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message: 'Failed to retrieve session.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

#### 2.1.3 Itinerary Generation Authentication

**Context:** Per US-012 (Concurrency guard), users cannot start multiple generations simultaneously. This is enforced at both the database level (partial unique constraint) and API level.

**Method:** `POST`  
**Path:** `/api/notes/:id/itineraries`  
**Description:** Generates an itinerary for a note  
**Auth:** Required (must own the note)

**Request:**
- Headers: `Cookie: sb-access-token=...`
- Body:
```json
{
  "request_id": "uuid",
  "preferences": {
    "terrain": "paved",
    "road_type": "scenic",
    "duration_h": 4.0,
    "distance_km": 250.0
  }
}
```

**Response (Success):**
```json
{
  "itinerary_id": "uuid",
  "status": "running",
  "version": 1
}
```
**Status:** `202 Accepted`

**Response (Concurrent Generation Error):**
```json
{
  "error": "generation_in_progress",
  "message": "You already have a generation in progress. Please wait for it to complete."
}
```
**Status:** `429 Too Many Requests`

**Response (Unauthorized):**
```json
{
  "error": "unauthorized",
  "message": "You do not have permission to generate itineraries for this note."
}
```
**Status:** `403 Forbidden`

**Implementation:**
```typescript
// src/pages/api/notes/[id]/itineraries.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, params, request }) => {
  const user = locals.user;
  
  if (!user) {
    return new Response(
      JSON.stringify({
        error: 'unauthorized',
        message: 'Please sign in to continue.'
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const noteId = params.id;
  const supabase = locals.supabase;

  // Verify note ownership
  const { data: note, error: noteError } = await supabase
    .from('notes')
    .select('user_id')
    .eq('note_id', noteId)
    .eq('deleted_at', null)
    .single();

  if (noteError || !note) {
    return new Response(
      JSON.stringify({
        error: 'not_found',
        message: 'Note not found.'
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (note.user_id !== user.id) {
    return new Response(
      JSON.stringify({
        error: 'unauthorized',
        message: 'You do not have permission to generate itineraries for this note.'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check for concurrent generation (US-012)
  const { data: runningItinerary } = await supabase
    .from('itineraries')
    .select('itinerary_id')
    .eq('user_id', user.id)
    .eq('status', 'running')
    .single();

  if (runningItinerary) {
    return new Response(
      JSON.stringify({
        error: 'generation_in_progress',
        message: 'You already have a generation in progress. Please wait for it to complete.'
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Proceed with generation...
  // (Implementation continues with OpenAI call)
};
```

---

### 2.2 Data Models

#### 2.2.1 User Model (Supabase Auth)

**Source:** `auth.users` table (managed by Supabase)

**Fields:**
```typescript
interface AuthUser {
  id: string;                    // UUID - primary key
  email: string;                 // User email from Google OAuth
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
  last_sign_in_at: string;       // ISO 8601 timestamp
  app_metadata: {
    provider: 'google';
    providers: ['google'];
  };
  user_metadata: {
    avatar_url?: string;         // Google profile picture URL
    full_name?: string;          // Google display name
    email_verified: boolean;
  };
}
```

**Note:** This table is managed entirely by Supabase Auth. The application only reads from it via `auth.users.id` foreign keys.

#### 2.2.2 Session Model (Supabase Auth)

**Source:** Supabase JWT tokens (stored in httpOnly cookies)

**Structure:**
```typescript
interface Session {
  access_token: string;          // JWT token
  refresh_token: string;         // Refresh token
  expires_in: number;            // Seconds until expiration (default: 3600)
  expires_at: number;            // Unix timestamp
  token_type: 'bearer';
  user: AuthUser;
}
```

**Storage:**
- Access token: `sb-access-token` cookie (httpOnly, secure, sameSite: lax)
- Refresh token: `sb-refresh-token` cookie (httpOnly, secure, sameSite: lax)

**Expiration:**
- Access token: 1 hour (Supabase default)
- Refresh token: 30 days (Supabase default)
- Auto-refresh handled by Supabase client

#### 2.2.3 Context Locals (Astro)

**Source:** `Astro.locals` (populated by middleware)

**Structure:**
```typescript
// src/env.d.ts
declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
    user: {
      id: string;
      email: string | null;
    } | null;
  }
}
```

**Usage in API routes:**
```typescript
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Use user.id for queries
};
```

---

### 2.3 Input Validation

#### 2.3.1 OAuth Callback Validation

**Validation Rules:**
- `code` parameter: Required, non-empty string
- PKCE code verifier: Automatically validated by Supabase (no manual check needed)
- No SQL injection risk (Supabase handles internally)

**Note on State Parameter:**
Supabase Auth uses PKCE (Proof Key for Code Exchange) flow instead of the traditional OAuth state parameter. PKCE provides stronger security against authorization code interception attacks. The code verifier is automatically generated, stored, and validated by the Supabase client - no manual state validation is required in the callback.

**Implementation:**
```typescript
// src/pages/auth/callback.astro
---
const code = Astro.url.searchParams.get('code');

// Validate code parameter
if (!code || typeof code !== 'string') {
  return Astro.redirect('/?error=missing_code');
}

// Proceed with token exchange
// Supabase will automatically validate the PKCE code verifier
---
```

#### 2.3.2 Session Validation (Middleware)

**Validation Rules:**
- Session must exist in cookies
- JWT must be valid (not expired, correct signature)
- User ID must exist in `auth.users` table

**Implementation:**
```typescript
// src/middleware/index.ts (extended)
export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = context.locals.supabase;
  const isDev = import.meta.env.DEVENV === 'true';

  if (isDev) {
    // Development mode: bypass auth
    context.locals.user = {
      id: DEFAULT_USER_ID,
      email: 'dev@viberide.local'
    };
  } else {
    // Production mode: validate session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session validation error:', error);
      context.locals.user = null;
    } else if (session?.user) {
      context.locals.user = {
        id: session.user.id,
        email: session.user.email ?? null
      };
    } else {
      context.locals.user = null;
    }
  }

  return next();
});
```

#### 2.3.3 Protected Route Validation

**Validation Rules:**
- User must be authenticated (`locals.user !== null`)
- Redirect to `/` if not authenticated
- **US-014 Requirement:** Preserve original URL for post-login redirect

**Implementation Pattern:**
```astro
---
// src/pages/notes.astro (example)
const user = Astro.locals.user;

if (!user) {
  // Store intended destination for post-login redirect (US-014)
  const returnTo = encodeURIComponent(Astro.url.pathname + Astro.url.search);
  return Astro.redirect(`/?returnTo=${returnTo}`);
}
---
```

**OAuth Callback with Return URL:**
```typescript
// src/pages/auth/callback.astro
// After successful authentication, check for returnTo parameter
const returnTo = Astro.url.searchParams.get('returnTo');

// Check if user preferences exist
const { data: preferences } = await supabaseClient
  .from('user_preferences')
  .select('user_id')
  .eq('user_id', userId)
  .single();

if (!preferences) {
  // New user must complete profile first
  return Astro.redirect('/profile');
}

// Existing user: redirect to intended destination or default to /notes
if (returnTo) {
  return Astro.redirect(decodeURIComponent(returnTo));
}

return Astro.redirect('/notes');
```

**Landing Page with Return URL:**
```typescript
// src/pages/index.astro
// Pass returnTo to OAuth flow
const returnTo = Astro.url.searchParams.get('returnTo');
// Pass to GoogleSignInButton component as prop
```

**Centralized Helper:**
```typescript
// src/lib/auth.ts
export function requireAuth(context: AstroGlobal) {
  if (!context.locals.user) {
    const returnTo = encodeURIComponent(context.url.pathname + context.url.search);
    return context.redirect(`/?returnTo=${returnTo}`);
  }
  return context.locals.user;
}

// Usage in pages:
const user = requireAuth(Astro);
```

---

### 2.4 Exception Handling

#### 2.4.1 OAuth Errors

**Error Types:**
- `access_denied`: User denied OAuth consent
- `invalid_request`: Malformed OAuth request
- `server_error`: Google OAuth server error
- PKCE validation failures: Handled by Supabase, surfaced as token exchange errors

**Handling:**
```typescript
// src/pages/auth/callback.astro
const error = Astro.url.searchParams.get('error');
const errorDescription = Astro.url.searchParams.get('error_description');

if (error) {
  const errorMap: Record<string, string> = {
    'access_denied': 'auth_cancelled',
    'invalid_request': 'invalid_request',
    'server_error': 'oauth_server_error'
  };
  
  const mappedError = errorMap[error] || 'auth_failed';
  logger.error({ error, errorDescription }, 'OAuth provider error');
  return Astro.redirect(`/?error=${mappedError}`);
}

// PKCE validation happens automatically in exchangeCodeForSession
// If PKCE fails, it will be caught in the token exchange error handling
```

#### 2.4.2 Session Errors

**Error Types:**
- `invalid_token`: JWT signature invalid or expired
- `refresh_failed`: Unable to refresh expired token
- `network_error`: Unable to reach Supabase Auth

**Handling:**
```typescript
// src/middleware/index.ts
try {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    if (error.message.includes('invalid')) {
      // Clear invalid session
      await supabase.auth.signOut();
      context.locals.user = null;
    } else if (error.message.includes('network')) {
      // Log but don't clear session (temporary issue)
      console.error('Network error during session check:', error);
    }
  }
} catch (err) {
  console.error('Unexpected session error:', err);
  context.locals.user = null;
}
```

#### 2.4.3 API Endpoint Errors

**Error Response Format:**
```typescript
interface AuthErrorResponse {
  error: string;                 // Error code
  message: string;               // User-facing message
  timestamp: string;             // ISO 8601 timestamp
}
```

**Error Codes:**
- `unauthorized`: No valid session
- `signout_failed`: Sign-out operation failed
- `server_error`: Unexpected server error

**Implementation:**
```typescript
// src/lib/errors.ts
export function authError(
  code: string, 
  message: string, 
  status: number
): Response {
  return new Response(
    JSON.stringify({
      error: code,
      message,
      timestamp: new Date().toISOString()
    }),
    { 
      status, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Usage:
return authError('unauthorized', 'Please sign in to continue.', 401);
```

---

### 2.5 Server-Side Rendering Updates

#### 2.5.1 Astro Configuration

**Current Configuration:**
```javascript
// astro.config.mjs
export default defineConfig({
  output: "server",
  integrations: [jwtIntegration(), react(), sitemap()],
  adapter: node({ mode: "standalone" }),
});
```

**No Changes Required:**
- SSR already enabled (`output: "server"`)
- Node adapter configured for standalone deployment
- JWT integration already present

#### 2.5.2 Page-Level SSR Patterns

**Landing Page (Unauthenticated):**
```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import GoogleSignInButton from '../components/GoogleSignInButton.tsx';
import AuthErrorBanner from '../components/AuthErrorBanner.tsx';

// Check if already authenticated
const user = Astro.locals.user;
if (user) {
  // Redirect authenticated users to notes
  return Astro.redirect('/notes');
}

// Extract error from query params
const error = Astro.url.searchParams.get('error');
---
<Layout title="Welcome to VibeRide">
  {error && <AuthErrorBanner error={error} client:load />}
  <HeroSection />
  <GoogleSignInButton client:load />
</Layout>
```

**OAuth Callback (Server-Only):**
```astro
---
// src/pages/auth/callback.astro
import { supabaseClient } from '../db/supabase.client';

const code = Astro.url.searchParams.get('code');
if (!code) {
  return Astro.redirect('/?error=missing_code');
}

try {
  const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
  
  if (error) throw error;

  // Check if user preferences exist
  const { data: prefs } = await supabaseClient
    .from('user_preferences')
    .select('user_id')
    .eq('user_id', data.session.user.id)
    .single();

  if (!prefs) {
    return Astro.redirect('/profile');
  }

  return Astro.redirect('/notes');
} catch (err) {
  console.error('OAuth callback error:', err);
  return Astro.redirect('/?error=auth_failed');
}
---
<html>
  <body>
    <div>Signing you in...</div>
  </body>
</html>
```

**Protected Pages (Authenticated):**
```astro
---
// src/pages/notes.astro
import AuthenticatedLayout from '../layouts/AuthenticatedLayout.astro';

const user = Astro.locals.user;
if (!user) {
  return Astro.redirect('/');
}
---
<AuthenticatedLayout title="My Notes">
  <NotesScreen user={user} client:load />
</AuthenticatedLayout>
```

#### 2.5.3 Middleware Integration

**Current Middleware:**
```typescript
// src/middleware/index.ts
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;
  
  const isDev = import.meta.env.DEVENV === 'true';
  
  if (isDev) {
    context.locals.user = {
      id: DEFAULT_USER_ID,
      email: 'dev@viberide.local'
    };
  } else {
    const { data: { session } } = await supabaseClient.auth.getSession();
    context.locals.user = session?.user ? {
      id: session.user.id,
      email: session.user.email
    } : null;
  }
  
  return next();
});
```

**Extended Middleware (with session refresh):**
```typescript
// src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';
import { supabaseClient, DEFAULT_USER_ID } from '../db/supabase.client.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  const isDev = import.meta.env.DEVENV === 'true';

  if (isDev) {
    context.locals.user = {
      id: DEFAULT_USER_ID,
      email: 'dev@viberide.local'
    };
  } else {
    try {
      // Get session (will auto-refresh if expired)
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error) {
        console.error('Session error:', error);
        context.locals.user = null;
      } else if (session?.user) {
        context.locals.user = {
          id: session.user.id,
          email: session.user.email ?? null
        };
      } else {
        context.locals.user = null;
      }
    } catch (err) {
      console.error('Middleware error:', err);
      context.locals.user = null;
    }
  }

  return next();
});
```

**Key Changes:**
- Added try-catch for error handling
- Session auto-refresh handled by Supabase client
- Null email handling (`email ?? null`)

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Supabase Auth Integration

#### 3.1.1 OAuth Provider Configuration

**Provider:** Google OAuth 2.0  
**Scopes:** `email`, `profile` (default)  
**Redirect URI:** `{APP_URL}/auth/callback`

**Supabase Dashboard Configuration:**
1. Navigate to Authentication > Providers
2. Enable Google provider
3. Add Google OAuth Client ID and Secret
4. Configure redirect URL: `https://your-project.supabase.co/auth/v1/callback`
5. Add authorized redirect URI in Google Cloud Console: `{APP_URL}/auth/callback`

**Environment Variables:**
```bash
# .env (not committed)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
DEVENV=false  # Set to 'true' for local development without auth
```

#### 3.1.2 Client-Side OAuth Flow

**Implementation:**
```typescript
// src/lib/auth.ts
import { supabaseClient } from '../db/supabase.client';

export async function signInWithGoogle(redirectTo?: string) {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });

  if (error) {
    console.error('OAuth initiation error:', error);
    throw error;
  }

  return data;
}
```

**Component Usage:**
```tsx
// src/components/GoogleSignInButton.tsx
import { signInWithGoogle } from '../lib/auth';

interface GoogleSignInButtonProps {
  returnTo?: string;  // US-014: Preserve intended destination
}

export function GoogleSignInButton({ returnTo }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build callback URL with returnTo parameter if provided
      const callbackUrl = returnTo 
        ? `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
        : `${window.location.origin}/auth/callback`;
      
      await signInWithGoogle(callbackUrl);
      // User will be redirected to Google
    } catch (err) {
      setError('Failed to initiate sign in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handleSignIn} 
        disabled={loading}
        className="btn-primary"
      >
        {loading ? (
          <>
            <Spinner /> Signing in...
          </>
        ) : (
          <>
            <GoogleIcon /> Sign in with Google
          </>
        )}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

#### 3.1.3 Server-Side Token Exchange

**Implementation:**
```typescript
// src/pages/auth/callback.astro
---
import { supabaseClient } from '../db/supabase.client';
import { logger } from '../lib/logger';

const code = Astro.url.searchParams.get('code');
const error = Astro.url.searchParams.get('error');

// Handle OAuth errors from provider
if (error) {
  logger.error({ error }, 'OAuth provider error');
  return Astro.redirect(`/?error=${error}`);
}

// Validate code parameter
if (!code || typeof code !== 'string') {
  logger.error('Missing or invalid code parameter');
  return Astro.redirect('/?error=missing_code');
}

try {
  // Exchange code for session
  const { data, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    logger.error({ err: exchangeError }, 'Token exchange failed');
    return Astro.redirect('/?error=auth_failed');
  }

  const userId = data.session.user.id;

  // Check if user preferences exist
  const { data: preferences, error: prefsError } = await supabaseClient
    .from('user_preferences')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (prefsError && prefsError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected for new users)
    logger.error({ err: prefsError, userId }, 'Error checking user preferences');
  }

  // Redirect based on profile completion
  if (!preferences) {
    logger.info({ userId }, 'New user, redirecting to profile');
    return Astro.redirect('/profile');
  }

  logger.info({ userId }, 'Existing user, redirecting to notes');
  return Astro.redirect('/notes');

} catch (err) {
  logger.error({ err }, 'Unexpected error in OAuth callback');
  return Astro.redirect('/?error=server_error');
}
---
<!DOCTYPE html>
<html>
  <head>
    <title>Signing in...</title>
    <style>
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: system-ui;
      }
    </style>
  </head>
  <body>
    <div>
      <p>Signing you in...</p>
    </div>
  </body>
</html>
```

---

### 3.2 Session Management

#### 3.2.1 Session Storage

**Mechanism:** HTTP-only cookies (managed by Supabase)

**Cookie Names:**
- `sb-access-token`: JWT access token
- `sb-refresh-token`: Refresh token

**Cookie Attributes:**
```
HttpOnly: true
Secure: true (production only)
SameSite: Lax
Path: /
Max-Age: 3600 (access token), 2592000 (refresh token)
```

**Configuration:**
```typescript
// src/db/supabase.client.ts (extended)
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseClient = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    db: { schema: 'viberide' },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',  // Proof Key for Code Exchange (PKCE) - more secure than state parameter
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'viberide-auth',
    }
  }
);

// Default user ID for DEVENV mode
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
```

**Note:** The `flowType: 'pkce'` setting is critical for security. It enables PKCE flow which:
- Automatically generates `code_verifier` and stores it in localStorage (key: `viberide-auth-code-verifier`)
- Sends `code_challenge` (SHA256 hash) to authorization server
- Validates the code verifier during token exchange
- Eliminates the need for manual state parameter validation

**PKCE Flow Details:**
When `flowType: 'pkce'` is enabled:
1. Client generates a random `code_verifier` (stored in session storage)
2. Client creates `code_challenge` = base64url(sha256(code_verifier))
3. Authorization request includes `code_challenge` and `code_challenge_method=S256`
4. After user consent, authorization server returns `code`
5. Token exchange includes both `code` and original `code_verifier`
6. Server validates that sha256(code_verifier) matches the original code_challenge
7. This prevents authorization code interception attacks without requiring state parameter

#### 3.2.2 Session Refresh

**Automatic Refresh:**
- Supabase client automatically refreshes tokens before expiration
- Refresh triggered when access token has < 10% lifetime remaining
- Refresh token valid for 30 days (default)

**Manual Refresh (if needed):**
```typescript
// src/lib/auth.ts
export async function refreshSession() {
  const { data, error } = await supabaseClient.auth.refreshSession();
  
  if (error) {
    console.error('Session refresh failed:', error);
    return null;
  }
  
  return data.session;
}
```

**Client-Side Listener:**
```typescript
// src/lib/auth.ts
export function setupAuthListener() {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = '/';
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Session refreshed successfully');
    } else if (event === 'USER_UPDATED') {
      console.log('User data updated');
    }
  });
}
```

**Usage in Root Layout:**
```astro
---
// src/layouts/Layout.astro
---
<html>
  <head>...</head>
  <body>
    <slot />
    <script>
      import { setupAuthListener } from '../lib/auth';
      setupAuthListener();
    </script>
  </body>
</html>
```

#### 3.2.3 Session Expiration Handling

**Middleware Detection:**
```typescript
// src/middleware/index.ts
const { data: { session }, error } = await supabaseClient.auth.getSession();

if (error || !session) {
  // Session expired or invalid
  context.locals.user = null;
  
  // Protected routes will redirect in page logic
}
```

**API Route Detection:**
```typescript
// src/pages/api/notes/index.ts
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        error: 'unauthorized',
        message: 'Your session has expired. Please sign in again.'
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Proceed with request
};
```

**Client-Side Handling:**
```typescript
// src/lib/http.ts (extended)
export async function apiRequest<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (response.status === 401) {
    // Session expired
    toast.error('Your session has expired. Please sign in again.');
    
    // Redirect after 3 seconds
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
    
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}
```

---

### 3.3 Sign-Out Implementation

#### 3.3.1 Client-Side Sign-Out

**Component:**
```tsx
// src/components/SignOutDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Sign out failed');
      }

      toast.success('You have been signed out.');
      
      // Redirect to landing page
      window.location.href = '/';
    } catch (err) {
      toast.error('Sign out failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign Out</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to sign out?</p>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3.3.2 Server-Side Sign-Out

**API Route:**
```typescript
// src/pages/api/auth/signout.ts
import type { APIRoute } from 'astro';
import { logger } from '../../lib/logger';

export const POST: APIRoute = async ({ locals, cookies }) => {
  const supabase = locals.supabase;
  const user = locals.user;

  if (!user) {
    return new Response(
      JSON.stringify({
        error: 'unauthorized',
        message: 'No active session to sign out.'
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error({ err: error, userId: user.id }, 'Sign out failed');
      return new Response(
        JSON.stringify({
          error: 'signout_failed',
          message: 'Failed to sign out. Please try again.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clear session cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    logger.info({ userId: user.id }, 'User signed out successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signed out successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error({ err, userId: user.id }, 'Unexpected sign out error');
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message: 'An unexpected error occurred.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

### 3.4 Account Recovery (Future)

**Note:** Password-based authentication is out of scope for MVP. Google OAuth does not require password recovery. However, the architecture supports future extension for email/password authentication.

**Future Implementation:**
- Path: `/auth/reset-password`
- Flow: Email input → Supabase magic link → Password reset page
- Supabase handles email delivery and link validation

---

### 3.5 Development Mode (DEVENV)

**Purpose:**
- Allow local development without Google OAuth setup
- Bypass authentication for testing

**Configuration:**
```bash
# .env
DEVENV=true
```

**Middleware Behavior:**
```typescript
// src/middleware/index.ts
const isDev = import.meta.env.DEVENV === 'true';

if (isDev) {
  // Bypass authentication
  context.locals.user = {
    id: DEFAULT_USER_ID,
    email: 'dev@viberide.local'
  };
} else {
  // Normal authentication flow
}
```

**Database Setup:**
```sql
-- Ensure default dev user exists in user_preferences
INSERT INTO viberide.user_preferences (
  user_id, 
  terrain, 
  road_type, 
  typical_duration_h, 
  typical_distance_km
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'paved',
  'scenic',
  4.0,
  250.0
) ON CONFLICT (user_id) DO NOTHING;
```

**Security:**
- DEVENV must be `false` or unset in production
- Add validation in deployment pipeline to prevent production use

---

## 4. INTEGRATION CHECKLIST

### 4.1 Frontend Tasks

- [ ] Create `GoogleSignInButton.tsx` component
- [ ] Create `AuthErrorBanner.tsx` component
- [ ] Create `SignOutDialog.tsx` component
- [ ] Extend `TabBar.tsx` with user avatar and sign-out option
- [ ] Extend `ProfileScreen.tsx` with sign-out button
- [ ] Create `src/pages/auth/callback.astro` page
- [ ] Update `src/pages/index.astro` with auth redirect logic
- [ ] Create `src/lib/auth.ts` utility functions
- [ ] Add auth state listener in root layout
- [ ] Update `src/lib/http.ts` with 401 handling
- [ ] Add error message mapping in client-side code

### 4.2 Backend Tasks

- [ ] Create `src/pages/api/auth/signout.ts` endpoint
- [ ] Create `src/pages/api/auth/session.ts` endpoint (optional)
- [ ] Extend `src/middleware/index.ts` with session refresh
- [ ] Create `src/lib/errors.ts` for auth error responses
- [ ] Add auth validation helper in `src/lib/auth.ts`
- [ ] Update existing API routes with 401 handling
- [ ] Add logging for auth events

### 4.3 Database Tasks

- [ ] Verify `auth.users` table exists (Supabase managed)
- [ ] Verify RLS policies on `viberide.user_preferences`
- [ ] Verify RLS policies on `viberide.notes`
- [ ] Verify RLS policies on `viberide.itineraries`
- [ ] Verify partial unique constraint on `itineraries(user_id)` WHERE `status='running'` (US-012)
- [ ] Create default dev user record for DEVENV mode
- [ ] Test foreign key constraints from `user_preferences` to `auth.users`
- [ ] Test foreign key constraints from `notes` to `auth.users`
- [ ] Test foreign key constraints from `itineraries` to `auth.users` and `notes`

### 4.4 Configuration Tasks

- [ ] Configure Google OAuth in Supabase Dashboard
- [ ] Add Google OAuth Client ID and Secret to Supabase
- [ ] Configure redirect URLs in Google Cloud Console
- [ ] Set `SUPABASE_URL` and `SUPABASE_KEY` environment variables
- [ ] Set `DEVENV=false` in production environment
- [ ] Update `astro.config.mjs` if needed (currently no changes required)
- [ ] Add security headers to responses (CSP, etc.)

### 4.5 Testing Tasks

- [ ] Test Google OAuth sign-in flow (happy path)
- [ ] Test OAuth error handling (denied, expired, invalid)
- [ ] Test new user redirect to profile (US-002)
- [ ] Test existing user redirect to notes
- [ ] Test return URL preservation after login (US-014)
- [ ] Test sign-out flow (US-001)
- [ ] Test session expiration during use
- [ ] Test session refresh
- [ ] Test concurrent sessions (multiple devices)
- [ ] Test DEVENV mode with default user
- [ ] Test protected route access without auth (US-014)
- [ ] Test 401 handling in API routes
- [ ] Test 403 handling for note ownership validation
- [ ] Test 429 handling for concurrent generation (US-012)
- [ ] Test error message display on landing page

---

## 5. SECURITY CONSIDERATIONS

### 5.1 Token Security

**JWT Storage:**
- Access tokens stored in httpOnly cookies (not accessible via JavaScript)
- Refresh tokens stored in httpOnly cookies
- Cookies marked as Secure in production (HTTPS only)
- SameSite=Lax to prevent CSRF attacks

**Token Validation:**
- All API routes validate JWT signature via Supabase client
- Expired tokens automatically refreshed by Supabase client
- Invalid tokens result in 401 response and redirect

### 5.2 OAuth Security

**PKCE Flow:**
- Proof Key for Code Exchange (PKCE) enabled by default via `flowType: 'pkce'`
- Prevents authorization code interception attacks
- Code verifier generated client-side, never transmitted to authorization server
- Code challenge (SHA256 hash of verifier) sent during authorization request
- Authorization code cannot be exchanged without the original code verifier

**Why PKCE Instead of State Parameter:**

Traditional OAuth flows use a `state` parameter to prevent CSRF attacks. However, PKCE provides superior security:

1. **CSRF Protection**: PKCE inherently prevents CSRF because the attacker cannot obtain the code_verifier stored in the legitimate client's session
2. **Code Interception Protection**: Even if an attacker intercepts the authorization code, they cannot exchange it for tokens without the code_verifier
3. **No Server-Side State Storage**: State parameter requires server-side storage or signed tokens; PKCE uses client-side session storage
4. **Recommended by OAuth 2.1**: The OAuth 2.1 draft mandates PKCE for all clients, deprecating the implicit flow and state-only protection

**PKCE Validation:**
- Supabase Auth automatically validates PKCE during `exchangeCodeForSession()`
- No manual state parameter validation required in callback code
- PKCE validation failures surface as token exchange errors (logged as `auth_failed`)
- The `state` parameter is not used when PKCE is enabled

### 5.3 Session Security

**Session Hijacking Prevention:**
- Tokens bound to specific user agent (Supabase default)
- Tokens expire after 1 hour (access) and 30 days (refresh)
- Sign-out invalidates all tokens server-side

**Concurrent Sessions:**
- Multiple sessions allowed (user can sign in on multiple devices)
- Each session has independent tokens
- Sign-out only affects current session

### 5.4 Row-Level Security (RLS)

**Policy Enforcement:**
- All `viberide` schema tables have RLS enabled
- Users can only access their own data (`user_id = auth.uid()`)
- Service role bypasses RLS for admin operations

**Policy Examples:**
```sql
-- User Preferences
CREATE POLICY "user_is_owner" ON viberide.user_preferences
FOR ALL USING (user_id = auth.uid());

-- Notes
CREATE POLICY "user_is_owner" ON viberide.notes
FOR ALL USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Itineraries
CREATE POLICY "user_is_owner" ON viberide.itineraries
FOR ALL USING (user_id = auth.uid() AND deleted_at IS NULL);
```

### 5.5 DEVENV Security

**Production Protection:**
- DEVENV must be explicitly set to `false` in production
- Add deployment pipeline check to prevent accidental production use
- Log warning if DEVENV is enabled

**Implementation:**
```typescript
// src/middleware/index.ts
const isDev = import.meta.env.DEVENV === 'true';

if (isDev && import.meta.env.PROD) {
  console.error('CRITICAL: DEVENV is enabled in production!');
  throw new Error('DEVENV must be disabled in production');
}
```

---

## 6. PERFORMANCE CONSIDERATIONS

### 6.1 Session Validation Caching

**Problem:** Middleware validates session on every request, which adds latency.

**Solution (Future):**
- Cache session validation results in memory for 1 minute
- Invalidate cache on sign-out or token refresh
- Reduces Supabase API calls by ~95%

**Implementation (Future):**
```typescript
const sessionCache = new Map<string, { user: User; expiresAt: number }>();

function getCachedSession(token: string) {
  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  return null;
}
```

### 6.2 OAuth Callback Optimization

**Current Flow:**
1. Exchange code for session (Supabase API call)
2. Check user preferences (Database query)
3. Redirect to appropriate page

**Optimization (Future):**
- Combine preference check with initial profile load on target page
- Reduces callback page latency by ~50ms

### 6.3 Client-Side Auth State

**Current Approach:**
- Auth state managed server-side via middleware
- Client-side components receive user prop from Astro

**Future Enhancement:**
- Add React Context for client-side auth state
- Reduces prop drilling in deeply nested components

---

## 7. MONITORING AND LOGGING

### 7.1 Auth Events to Log

**Sign-In Events:**
- Successful sign-in (user ID, timestamp, IP address)
- Failed sign-in (error code, timestamp, IP address)
- OAuth provider errors (error code, description)

**Sign-Out Events:**
- Successful sign-out (user ID, timestamp)
- Failed sign-out (user ID, error code)

**Session Events:**
- Session refresh (user ID, timestamp)
- Session expiration (user ID, timestamp)
- Invalid token detected (user ID, error code)

**Implementation:**
```typescript
// src/lib/logger.ts (extended)
export const authLogger = {
  signInSuccess: (userId: string, ip: string) => {
    logger.info({ userId, ip, event: 'sign_in_success' }, 'User signed in');
  },
  signInFailed: (error: string, ip: string) => {
    logger.error({ error, ip, event: 'sign_in_failed' }, 'Sign in failed');
  },
  signOutSuccess: (userId: string) => {
    logger.info({ userId, event: 'sign_out_success' }, 'User signed out');
  },
  sessionRefresh: (userId: string) => {
    logger.info({ userId, event: 'session_refresh' }, 'Session refreshed');
  }
};
```

### 7.2 Metrics to Track

**Authentication Metrics:**
- Sign-in success rate (target: >99%)
- Sign-in latency (target: <2s p95)
- Session refresh success rate (target: >99%)
- Sign-out success rate (target: >99%)

**User Metrics:**
- New user registrations per day
- Active sessions (concurrent users)
- Average session duration
- Profile completion rate (target: >90% per US-002)

**Error Metrics:**
- OAuth error rate by type
- Session expiration rate
- 401 error rate on API endpoints

---

## 8. FUTURE ENHANCEMENTS

### 8.1 Email/Password Authentication

**Scope:** Post-MVP  
**Requirements:**
- Add email/password sign-up form
- Add password reset flow
- Add email verification
- Extend Supabase Auth configuration

### 8.2 Multi-Factor Authentication (MFA)

**Scope:** Post-MVP  
**Requirements:**
- Enable Supabase MFA
- Add TOTP setup flow
- Add MFA challenge during sign-in
- Add recovery codes

### 8.3 Social Login Providers

**Scope:** Post-MVP  
**Providers:** Facebook, Apple, GitHub  
**Requirements:**
- Configure additional OAuth providers in Supabase
- Add provider-specific sign-in buttons
- Handle provider-specific user metadata

### 8.4 Session Management Dashboard

**Scope:** Post-MVP  
**Features:**
- View active sessions
- Revoke specific sessions
- Sign out from all devices
- Session history log

---

## 9. APPENDIX

### 9.1 Type Definitions

```typescript
// src/types.ts (additions)

/**
 * User authentication context
 * Available in Astro.locals.user
 */
export interface AuthUser {
  id: string;           // UUID from auth.users
  email: string | null; // User email (may be null for some providers)
}

/**
 * OAuth error codes
 */
export type OAuthErrorCode =
  | 'auth_failed'           // General authentication failure (includes PKCE validation failures)
  | 'invalid_code'          // Authorization code is invalid
  | 'expired_code'          // Authorization code has expired
  | 'network_error'         // Network connectivity issue
  | 'auth_cancelled'        // User denied OAuth consent
  | 'oauth_server_error';   // OAuth provider (Google) server error

/**
 * Auth error response
 */
export interface AuthErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

/**
 * Sign-out response
 */
export interface SignOutResponse {
  success: true;
  message: string;
}

/**
 * Session status response
 */
export interface SessionStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
  expires_at?: string;
}
```

### 9.2 Environment Variables

```bash
# Required for production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Optional for development
DEVENV=false  # Set to 'true' to bypass authentication

# Google OAuth (configured in Supabase Dashboard)
# No environment variables needed in application code
```

### 9.3 Supabase Configuration

**Auth Settings (Supabase Dashboard):**
- JWT expiry: 3600 seconds (1 hour)
- Refresh token expiry: 2592000 seconds (30 days)
- Enable email confirmations: No (OAuth only for MVP)
- Enable phone confirmations: No
- Minimum password length: N/A (OAuth only)

**OAuth Provider Settings:**
- Provider: Google
- Client ID: (from Google Cloud Console)
- Client Secret: (from Google Cloud Console)
- Authorized redirect URI: `{APP_URL}/auth/callback`

### 9.4 Testing Checklist

**Manual Testing:**
- [ ] Sign in with Google (new user)
- [ ] Sign in with Google (existing user)
- [ ] Sign out from profile page
- [ ] Sign out from tab bar menu
- [ ] Access protected route without auth (should redirect)
- [ ] Session expiration during browsing
- [ ] OAuth error handling (deny consent)
- [ ] Network error during sign-in
- [ ] Multiple devices (concurrent sessions)
- [ ] DEVENV mode with default user

**Automated Testing (Future):**
- [ ] Unit tests for auth utility functions
- [ ] Integration tests for OAuth callback
- [ ] Integration tests for sign-out endpoint
- [ ] E2E tests for complete sign-in flow
- [ ] E2E tests for session expiration handling

---

## Document Metadata

**Version:** 1.1  
**Last Updated:** 2025-11-24  
**Author:** AI Assistant  
**Status:** Ready for Implementation  
**Related Documents:**
- `.ai/prd.md` - Product Requirements Document
- `.ai/api-plan.md` - REST API Plan
- `.ai/db-plan.md` - Database Schema
- `.ai/ui-plan.md` - UI Architecture
- `.ai/tech-stack.md` - Technology Stack

---

## Changelog

### Version 1.1 (2025-11-24)
**Changes to align with PRD user stories and database schema:**

1. **US-014 Implementation** - Added return URL preservation for post-login redirects:
   - Protected routes now capture and encode the original URL
   - OAuth callback checks for `returnTo` parameter
   - Landing page passes `returnTo` to sign-in flow
   - GoogleSignInButton component accepts `returnTo` prop

2. **US-012 Integration** - Added itinerary generation authentication section:
   - New endpoint documentation: `POST /api/notes/:id/itineraries`
   - Note ownership validation (403 Forbidden)
   - Concurrent generation check (429 Too Many Requests)
   - Integration with database partial unique constraint

3. **Database Integration** - Enhanced database task checklist:
   - Added verification of itineraries table RLS policies
   - Added foreign key constraint testing for all tables
   - Added partial unique constraint verification for concurrency control

4. **Supabase Client Configuration** - Enhanced client setup documentation:
   - Added complete client initialization code
   - Documented localStorage storage configuration
   - Clarified PKCE code verifier storage mechanism
   - Added environment variable validation

5. **Error Handling Clarification** - Fixed middleware vs. client-side error handling:
   - Clarified that 401 handling occurs in `src/lib/http.ts`, not middleware
   - Updated session expiration scenario to reflect client-side interception
   - Added sessionStorage flag to prevent redirect loops

6. **Security Documentation** - Incorporated PKCE security fix:
   - All references to manual state parameter validation removed
   - PKCE flow comprehensively documented
   - Security rationale for PKCE over state parameter explained

7. **Testing Enhancements** - Expanded testing checklist:
   - Added US-014 return URL testing
   - Added US-012 concurrent generation testing
   - Added 403 and 429 error handling tests

**Breaking Changes:** None - all changes are additive or clarifications.

**Migration Required:** None - specification updates only.

---

**End of Authentication System Specification**

