# Feature Flag Integration Guide

This guide shows how to integrate feature flags into existing VibeRide code.

## Prerequisites

1. Set `ENV_NAME` environment variable
2. Astro config updated (already done in `astro.config.mjs`)
3. Feature flag system installed in `src/lib/features/`

## Integration Checklist

### ✅ Step 1: Protect Auth API Endpoints

Update all authentication-related API endpoints:

#### Files to Update:
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/signup.ts`
- `src/pages/api/auth/logout.ts`
- `src/pages/api/auth/callback.ts`
- Any other `/api/auth/*` endpoints

#### Example:

**Before:**
```typescript
// src/pages/api/auth/login.ts
export async function POST(request: Request) {
  const data = await request.json();
  // ... login logic
  return new Response(JSON.stringify({ success: true }));
}
```

**After:**
```typescript
// src/pages/api/auth/login.ts
import { guardApiEndpoint } from '@/lib/features/guards';

export async function POST(request: Request) {
  const guard = guardApiEndpoint('auth');
  if (guard) return guard;
  
  const data = await request.json();
  // ... login logic
  return new Response(JSON.stringify({ success: true }));
}
```

### ✅ Step 2: Protect Auth Pages

Update all authentication-related pages:

#### Files to Update:
- `src/pages/auth/login.astro`
- `src/pages/auth/signup.astro`
- Any other `/auth/*` pages

#### Example:

**Before:**
```astro
---
// src/pages/auth/login.astro
import Layout from '@/layouts/Layout.astro';
---

<Layout title="Login">
  <h1>Login</h1>
  <!-- login form -->
</Layout>
```

**After:**
```astro
---
// src/pages/auth/login.astro
import Layout from '@/layouts/Layout.astro';
import { guardPage } from '@/lib/features/guards';

const guard = guardPage('auth', '/');
if (guard) return guard;
---

<Layout title="Login">
  <h1>Login</h1>
  <!-- login form -->
</Layout>
```

### ✅ Step 3: Protect Collections API Endpoints

Update all collections-related API endpoints:

#### Files to Update:
- `src/pages/api/collections/*.ts`
- Any other collections-related endpoints

#### Example:

**Before:**
```typescript
// src/pages/api/collections/index.ts
export async function GET() {
  // ... fetch collections
  return new Response(JSON.stringify({ collections: [] }));
}
```

**After:**
```typescript
// src/pages/api/collections/index.ts
import { guardApiEndpoint } from '@/lib/features/guards';

export async function GET() {
  const guard = guardApiEndpoint('collections');
  if (guard) return guard;
  
  // ... fetch collections
  return new Response(JSON.stringify({ collections: [] }));
}
```

### ✅ Step 4: Update Navigation Components

Hide navigation items for disabled features:

#### Files to Update:
- `src/components/TabBar.tsx`
- `src/components/Navigation.tsx` (if exists)
- Any other navigation components

#### Example:

**Before:**
```typescript
// src/components/TabBar.tsx
export function TabBar() {
  return (
    <nav>
      <a href="/">Home</a>
      <a href="/auth/login">Login</a>
      <a href="/collections">Collections</a>
    </nav>
  );
}
```

**After:**
```typescript
// src/components/TabBar.tsx
import { shouldShowFeature } from '@/lib/features/guards';

export function TabBar() {
  return (
    <nav>
      <a href="/">Home</a>
      
      {shouldShowFeature('auth') && (
        <a href="/auth/login">Login</a>
      )}
      
      {shouldShowFeature('collections') && (
        <a href="/collections">Collections</a>
      )}
    </nav>
  );
}
```

### ✅ Step 5: Update Landing Page / Welcome Screen

Conditionally show features on landing pages:

#### Files to Update:
- `src/components/LandingPage.tsx`
- `src/components/Welcome.astro`
- `src/pages/index.astro`

#### Example:

**Before:**
```typescript
// src/components/LandingPage.tsx
export function LandingPage() {
  return (
    <div>
      <h1>Welcome to VibeRide</h1>
      <div>
        <h2>Features</h2>
        <ul>
          <li>Secure Authentication</li>
          <li>Collections Management</li>
        </ul>
      </div>
    </div>
  );
}
```

**After:**
```typescript
// src/components/LandingPage.tsx
import { shouldShowFeature } from '@/lib/features/guards';

export function LandingPage() {
  return (
    <div>
      <h1>Welcome to VibeRide</h1>
      <div>
        <h2>Features</h2>
        <ul>
          {shouldShowFeature('auth') && (
            <li>Secure Authentication</li>
          )}
          {shouldShowFeature('collections') && (
            <li>Collections Management</li>
          )}
        </ul>
      </div>
    </div>
  );
}
```

### ✅ Step 6: Update Middleware (Optional)

Add feature flag checks to middleware for early protection:

#### File to Update:
- `src/middleware/index.ts`

#### Example:

**Before:**
```typescript
// src/middleware/index.ts
export function onRequest(context, next) {
  // ... existing middleware
  return next();
}
```

**After:**
```typescript
// src/middleware/index.ts
import { guardApiEndpoint } from '@/lib/features/guards';

export function onRequest(context, next) {
  const url = new URL(context.request.url);
  
  // Protect auth routes
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/auth/')) {
    const guard = guardApiEndpoint('auth');
    if (guard) return guard;
  }
  
  // Protect collections routes
  if (url.pathname.startsWith('/collections/') || url.pathname.startsWith('/api/collections/')) {
    const guard = guardApiEndpoint('collections');
    if (guard) return guard;
  }
  
  // ... existing middleware
  return next();
}
```

## Testing Your Integration

### 1. Test Local Environment (All Features Enabled)

```bash
ENV_NAME=local npm run dev
```

Expected behavior:
- ✅ Auth pages accessible
- ✅ Auth API endpoints work
- ✅ Collections visible
- ✅ All navigation items visible

### 2. Test Integration Environment (Collections Disabled)

```bash
ENV_NAME=integration npm run dev
```

Expected behavior:
- ✅ Auth pages accessible
- ✅ Auth API endpoints work
- ❌ Collections hidden
- ❌ Collections API returns 503
- ✅ Auth navigation items visible
- ❌ Collections navigation items hidden

### 3. Test Production Environment (All Features Disabled)

```bash
ENV_NAME=prod npm run dev
```

Expected behavior:
- ❌ Auth pages redirect to home
- ❌ Auth API returns 503
- ❌ Collections hidden
- ❌ Collections API returns 503
- ❌ All feature navigation items hidden

### 4. Test Environment Variable Overrides

```bash
ENV_NAME=prod FEATURE_FLAG_AUTH=true npm run dev
```

Expected behavior:
- ✅ Auth enabled despite prod environment
- ❌ Collections still disabled

## Verification Endpoint

Create a test endpoint to verify your configuration:

```typescript
// src/pages/api/debug/feature-flags.ts
import { getAllFeatureFlags, getCurrentEnvironment } from '@/lib/features';

export async function GET() {
  // Only allow in non-prod environments
  if (getCurrentEnvironment() === 'prod') {
    return new Response('Not available in production', { status: 403 });
  }
  
  return new Response(
    JSON.stringify({
      environment: getCurrentEnvironment(),
      flags: getAllFeatureFlags(),
    }, null, 2),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

Visit `/api/debug/feature-flags` to see your current configuration.

## Common Integration Patterns

### Pattern 1: Conditional Service Initialization

```typescript
// src/lib/services/authService.ts
import { isFeatureEnabled } from '@/lib/features';

export function initializeAuthService() {
  if (!isFeatureEnabled('auth')) {
    console.log('Auth service disabled');
    return null;
  }
  
  // Initialize auth service
  return new AuthService();
}
```

### Pattern 2: Feature-Gated Components

```typescript
// src/components/FeatureGate.tsx
import { shouldShowFeature } from '@/lib/features/guards';
import type { FeatureFlag } from '@/lib/features';

interface FeatureGateProps {
  feature: FeatureFlag;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  if (!shouldShowFeature(feature)) {
    return fallback;
  }
  
  return <>{children}</>;
}

// Usage:
<FeatureGate feature="collections" fallback={<p>Coming soon!</p>}>
  <CollectionsView />
</FeatureGate>
```

### Pattern 3: Multiple Feature Checks

```typescript
// src/components/Dashboard.tsx
import { isFeatureEnabled } from '@/lib/features';

export function Dashboard() {
  const hasAuth = isFeatureEnabled('auth');
  const hasCollections = isFeatureEnabled('collections');
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {hasAuth && hasCollections && (
        <p>Full access to all features</p>
      )}
      
      {hasAuth && !hasCollections && (
        <p>Authentication available, collections coming soon</p>
      )}
      
      {!hasAuth && !hasCollections && (
        <p>Core features only</p>
      )}
    </div>
  );
}
```

## Rollout Strategy

### Phase 1: Local Development (Week 1)
- Set `ENV_NAME=local`
- All features enabled
- Test integration
- Fix any issues

### Phase 2: Integration Environment (Week 2)
- Set `ENV_NAME=integration`
- Test with collections disabled
- Verify "coming soon" messages
- Test auth flows

### Phase 3: Production Soft Launch (Week 3)
- Set `ENV_NAME=prod`
- All features disabled by default
- Enable auth via override: `FEATURE_FLAG_AUTH=true`
- Monitor for issues

### Phase 4: Full Production (Week 4+)
- Gradually enable features
- Update default config as features stabilize
- Remove overrides
- Monitor usage and errors

## Troubleshooting

### Issue: Features not respecting environment

**Solution:**
```bash
# Check environment variable is set
echo $ENV_NAME

# Restart dev server after changing ENV_NAME
npm run dev
```

### Issue: Overrides not working

**Solution:**
```bash
# Check override format
FEATURE_FLAG_AUTH=true  # ✅ Correct
FEATURE_FLAG_auth=true  # ❌ Wrong (lowercase)
AUTH=true               # ❌ Wrong (missing prefix)

# Restart dev server after setting overrides
```

### Issue: TypeScript errors

**Solution:**
```typescript
// Make sure you're importing from the correct path
import { isFeatureEnabled } from '@/lib/features';  // ✅ Correct
import { isFeatureEnabled } from '@/lib/features/index';  // ✅ Also correct
import { isFeatureEnabled } from './features';  // ❌ May not work
```

## Next Steps

After integration:

1. ✅ Update CI/CD pipelines to set `ENV_NAME`
2. ✅ Document feature flag status in deployment docs
3. ✅ Train team on feature flag usage
4. ✅ Set up monitoring for 503 responses
5. ✅ Plan feature rollout schedule

## Support

For questions or issues:
- See [README.md](./README.md) for detailed documentation
- See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for quick examples
- See [examples.ts](./examples.ts) for code examples
