>>># Feature Flags - Quick Reference

## Setup

Set environment variable:
```bash
ENV_NAME=local|integration|prod
```

## Common Patterns

### API Endpoint
```typescript
import { guardApiEndpoint } from '@/lib/features/guards';

export async function POST() {
  const guard = guardApiEndpoint('auth');
  if (guard) return guard;
  // ... your logic
}
```

### Astro Page
```typescript
---
import { guardPage } from '@/lib/features/guards';
const guard = guardPage('auth', '/');
if (guard) return guard;
---
```

### React Component
```typescript
import { shouldShowFeature } from '@/lib/features/guards';

{shouldShowFeature('collections') && <CollectionsLink />}
```

### Simple Check
```typescript
import { isFeatureEnabled } from '@/lib/features';

if (isFeatureEnabled('auth')) {
  // feature enabled
}
```

## Current Features

- `auth` - Authentication system (login, signup, etc.)
- `collections` - Collections feature

## Environment Overrides

```bash
FEATURE_FLAG_AUTH=false
FEATURE_FLAG_COLLECTIONS=true
```

## Adding New Features

1. Add to `types.ts`: `export type FeatureFlag = 'auth' | 'collections' | 'newFeature';`
2. Add to `config.ts`: Set defaults for each environment
3. Update `index.ts`: Add to features array in `loadConfig()`
