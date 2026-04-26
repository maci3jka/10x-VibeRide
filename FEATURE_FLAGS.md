# Feature Flag System

## Overview

VibeRide uses a type-safe feature flag system to separate deployments from releases. Features can be enabled or disabled per environment (local, integration, prod) without code changes.

## Quick Start

1. **Set your environment**:
   ```bash
   ENV_NAME=local  # or integration, prod
   ```

2. **Check a feature in code**:
   ```typescript
   import { isFeatureEnabled } from '@/lib/features';
   
   if (isFeatureEnabled('auth')) {
     // Feature is enabled
   }
   ```

3. **Protect an API endpoint**:
   ```typescript
   import { guardApiEndpoint } from '@/lib/features/guards';
   
   export async function POST() {
     const guard = guardApiEndpoint('auth');
     if (guard) return guard;
     // ... your logic
   }
   ```

## Available Features

| Feature | Description | Local | Integration | Prod |
|---------|-------------|-------|-------------|------|
| `auth` | Authentication system (login, signup) | ✅ | ✅ | ❌ |
| `collections` | Collections feature | ✅ | ❌ | ❌ |

## Architecture

The feature flag system is located in `src/lib/features/` and consists of:

- **`index.ts`** - Main module with flag checking functions
- **`types.ts`** - TypeScript types and interfaces
- **`config.ts`** - Feature flag configuration per environment
- **`guards.ts`** - Guard functions for routes and endpoints
- **`errors.ts`** - Error handling and "coming soon" responses

## Usage Patterns

### 1. API Endpoint Protection

Protect API routes from being accessed when features are disabled:

```typescript
// src/pages/api/auth/login.ts
import { guardApiEndpoint } from '@/lib/features/guards';

export async function POST(request: Request) {
  const guard = guardApiEndpoint('auth');
  if (guard) return guard; // Returns 503 with "coming soon" message
  
  // Feature enabled - continue with logic
  const data = await request.json();
  // ... handle login
}
```

### 2. Astro Page Protection

Redirect users away from pages when features are disabled:

```typescript
// src/pages/auth/login.astro
---
import { guardPage } from '@/lib/features/guards';

const guard = guardPage('auth', '/');
if (guard) return guard; // Redirects to '/' if disabled
---

<html>
  <body>
    <h1>Login Page</h1>
  </body>
</html>
```

### 3. UI Element Visibility

Conditionally show/hide UI elements based on feature flags:

```typescript
// src/components/Navigation.tsx
import { shouldShowFeature } from '@/lib/features/guards';

export function Navigation() {
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

## Configuration

### Default Configuration

Default flags are defined in `src/lib/features/config.ts`:

```typescript
export const DEFAULT_CONFIG: FeatureFlagsConfig = {
  local: {
    auth: true,
    collections: true,
  },
  integration: {
    auth: true,
    collections: false,
  },
  prod: {
    auth: false,
    collections: false,
  },
};
```

### Environment Variable Overrides

Override flags at runtime using environment variables:

```bash
# Enable auth in production
ENV_NAME=prod
FEATURE_FLAG_AUTH=true

# Disable collections in local
ENV_NAME=local
FEATURE_FLAG_COLLECTIONS=false
```

Pattern: `FEATURE_FLAG_<FEATURE_NAME>=true|false`

## Disabled Feature Behavior

When a feature is disabled:

- **API endpoints**: Return HTTP 503 with JSON response:
  ```json
  {
    "error": "FEATURE_DISABLED",
    "message": "The auth feature is coming soon. Stay tuned!",
    "feature": "auth",
    "comingSoon": true
  }
  ```

- **Pages**: Redirect to home page (or custom URL)

- **UI elements**: Hidden from view

## Adding New Features

To add a new feature flag:

1. **Update types** (`src/lib/features/types.ts`):
   ```typescript
   export type FeatureFlag = 'auth' | 'collections' | 'newFeature';
   ```

2. **Update config** (`src/lib/features/config.ts`):
   ```typescript
   export const DEFAULT_CONFIG: FeatureFlagsConfig = {
     local: { auth: true, collections: true, newFeature: true },
     integration: { auth: true, collections: false, newFeature: false },
     prod: { auth: false, collections: false, newFeature: false },
   };
   ```

3. **Update loadConfig** (`src/lib/features/index.ts`):
   ```typescript
   const features: FeatureFlag[] = ['auth', 'collections', 'newFeature'];
   ```

4. **Update Astro config** (`astro.config.mjs`):
   ```javascript
   define: {
     'import.meta.env.FEATURE_FLAG_NEWFEATURE': JSON.stringify(
       process.env.FEATURE_FLAG_NEWFEATURE
     ),
   }
   ```

TypeScript will enforce type safety across the entire system.

## API Reference

### Core Functions

- **`isFeatureEnabled(feature)`** - Check if a feature is enabled
- **`getFeatureFlag(feature)`** - Get detailed flag information
- **`getAllFeatureFlags()`** - Get all flags for current environment
- **`getCurrentEnvironment()`** - Get current environment name

### Guard Functions

- **`guardApiEndpoint(feature)`** - Protect API endpoints
- **`guardPage(feature, redirectTo?)`** - Protect Astro pages
- **`shouldShowFeature(feature)`** - Check UI element visibility

### Error Handling

- **`createComingSoonResponse(feature)`** - Create "coming soon" JSON response
- **`createFeatureDisabledResponse(feature)`** - Create HTTP 503 response
- **`FeatureDisabledError`** - Error class for disabled features

## Testing

Run tests:
```bash
npm test src/lib/features
```

The feature flag system includes comprehensive unit tests for:
- Environment detection
- Flag checking
- Guard functions
- Environment variable overrides
- Config caching

## Documentation

- **[README.md](src/lib/features/README.md)** - Comprehensive guide
- **[QUICK_REFERENCE.md](src/lib/features/QUICK_REFERENCE.md)** - Quick reference
- **[ENVIRONMENT_SETUP.md](src/lib/features/ENVIRONMENT_SETUP.md)** - Environment setup
- **[examples.ts](src/lib/features/examples.ts)** - Code examples

## Benefits

1. **Separate deployments from releases** - Deploy code without exposing features
2. **Environment-specific control** - Different flags per environment
3. **Type-safe** - TypeScript ensures only valid features can be checked
4. **Consistent UX** - Standardized "coming soon" messages
5. **Easy testing** - Test features in isolation
6. **No code changes** - Toggle features via environment variables

## Next Steps

The current implementation provides the foundation. Future enhancements could include:

- Remote flag configuration (database/API)
- User-based targeting
- Percentage-based rollouts
- A/B testing support
- Admin UI for flag management
- Real-time flag updates

For now, the system provides a solid, type-safe foundation for feature flag management in VibeRide.
