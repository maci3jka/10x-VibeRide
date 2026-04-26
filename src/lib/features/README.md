# Feature Flag System

A type-safe feature flag system for controlling feature visibility across environments (local, integration, prod).

## Overview

This module allows you to:
- Enable/disable features per environment
- Protect API endpoints with feature flags
- Control page visibility with feature flags
- Hide/show UI elements based on feature flags
- Override flags via environment variables

## Configuration

Feature flags are configured in `config.ts` with default values for each environment:

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

### Environment Variables

You can override any flag at build/startup time using environment variables:

```bash
# Override auth flag
FEATURE_FLAG_AUTH=false

# Override collections flag
FEATURE_FLAG_COLLECTIONS=true
```

Pattern: `FEATURE_FLAG_<FEATURE_NAME>=true|false`

### Setting the Environment

Set the `ENV_NAME` environment variable to specify the current environment:

```bash
ENV_NAME=local        # Local development
ENV_NAME=integration  # Integration/staging
ENV_NAME=prod         # Production
```

## Usage

### 1. API Endpoint Protection

Use `guardApiEndpoint` to protect API routes:

```typescript
// src/pages/api/auth/login.ts
import { guardApiEndpoint } from '@/lib/features/guards';

export async function POST(request: Request) {
  // Check if auth feature is enabled
  const guard = guardApiEndpoint('auth');
  if (guard) return guard; // Returns 503 with "coming soon" message
  
  // Feature is enabled, continue with normal logic
  const data = await request.json();
  // ... handle login
  return new Response(JSON.stringify({ success: true }));
}
```

### 2. Astro Page Protection

Use `guardPage` to protect entire pages:

```typescript
// src/pages/auth/login.astro
---
import { guardPage } from '@/lib/features/guards';

const guard = guardPage('auth', '/'); // Redirects to '/' if disabled
if (guard) return guard;
---

<html>
  <body>
    <h1>Login Page</h1>
    <!-- Page content -->
  </body>
</html>
```

### 3. UI Element Visibility (React)

Use `shouldShowFeature` to conditionally render UI elements:

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

### 4. Direct Flag Checking

Use `isFeatureEnabled` for simple boolean checks:

```typescript
import { isFeatureEnabled } from '@/lib/features';

if (isFeatureEnabled('collections')) {
  // Feature is enabled
  console.log('Collections feature is available');
}
```

### 5. Detailed Flag Information

Use `getFeatureFlag` for detailed information:

```typescript
import { getFeatureFlag } from '@/lib/features';

const result = getFeatureFlag('auth');
console.log(result);
// {
//   enabled: true,
//   feature: 'auth',
//   environment: 'local'
// }
```

### 6. Get All Flags

Use `getAllFeatureFlags` to get all flags at once:

```typescript
import { getAllFeatureFlags } from '@/lib/features';

const flags = getAllFeatureFlags();
console.log(flags);
// { auth: true, collections: false }
```

## Response Format

When a feature is disabled, API endpoints return a standardized response:

```json
{
  "error": "FEATURE_DISABLED",
  "message": "The auth feature is coming soon. Stay tuned!",
  "feature": "auth",
  "comingSoon": true
}
```

HTTP Status: `503 Service Unavailable`
Header: `Retry-After: 3600` (1 hour)

## Adding New Features

To add a new feature flag:

1. Add the feature name to the `FeatureFlag` type in `types.ts`:

```typescript
export type FeatureFlag = 'auth' | 'collections' | 'newFeature';
```

2. Add the feature to the configuration in `config.ts`:

```typescript
export const DEFAULT_CONFIG: FeatureFlagsConfig = {
  local: {
    auth: true,
    collections: true,
    newFeature: true, // Add here
  },
  integration: {
    auth: true,
    collections: false,
    newFeature: false, // Add here
  },
  prod: {
    auth: false,
    collections: false,
    newFeature: false, // Add here
  },
};
```

3. Update the features array in `index.ts` (in the `loadConfig` function):

```typescript
const features: FeatureFlag[] = ['auth', 'collections', 'newFeature'];
```

TypeScript will ensure type safety across the entire system.

## Type Safety

The system is fully type-safe. TypeScript will catch errors at compile time:

```typescript
// ✅ Valid - 'auth' is a defined feature
isFeatureEnabled('auth');

// ❌ Compile error - 'invalid' is not a defined feature
isFeatureEnabled('invalid');
```

## Testing

For testing purposes, you can reset the cached configuration:

```typescript
import { resetConfig } from '@/lib/features';

// In your test setup
beforeEach(() => {
  resetConfig();
});
```

## Architecture

```
src/lib/features/
├── index.ts       # Main module with flag checking functions
├── types.ts       # TypeScript types and interfaces
├── config.ts      # Feature flag configuration
├── guards.ts      # Guard functions for routes and endpoints
├── errors.ts      # Error handling and responses
└── README.md      # This file
```

## Best Practices

1. **Always use guards at the entry point**: Protect API endpoints and pages at the top level before any logic executes.

2. **Use type-safe functions**: Always use the provided functions (`isFeatureEnabled`, `guardApiEndpoint`, etc.) rather than accessing config directly.

3. **Consistent messaging**: Use the provided response functions to ensure consistent "coming soon" messages.

4. **Environment variables for overrides**: Use environment variables for temporary overrides, but keep the default config as the source of truth.

5. **Test with different environments**: Test your application with different `ENV_NAME` values to ensure features are properly gated.
