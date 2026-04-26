# Environment Setup for Feature Flags

## Required Environment Variable

The feature flag system requires the `ENV_NAME` environment variable to be set:

```bash
ENV_NAME=local|integration|prod
```

## Setting Up Your Environment

### Local Development

Add to your `.env.local` file:

```bash
ENV_NAME=local
```

### Integration/Staging

Add to your `.env` or deployment configuration:

```bash
ENV_NAME=integration
```

### Production

Add to your production environment configuration:

```bash
ENV_NAME=prod
```

## Optional: Feature Flag Overrides

You can override individual feature flags using environment variables:

```bash
# Override auth feature
FEATURE_FLAG_AUTH=true

# Override collections feature
FEATURE_FLAG_COLLECTIONS=false
```

### Example: Enable Collections in Integration

```bash
ENV_NAME=integration
FEATURE_FLAG_COLLECTIONS=true
```

This will enable the collections feature in the integration environment, even though it's disabled by default in the configuration.

## Astro Configuration

Make sure your `astro.config.mjs` includes environment variables:

```javascript
export default defineConfig({
  // ... other config
  vite: {
    define: {
      'import.meta.env.ENV_NAME': JSON.stringify(process.env.ENV_NAME || 'local'),
      'import.meta.env.FEATURE_FLAG_AUTH': JSON.stringify(process.env.FEATURE_FLAG_AUTH),
      'import.meta.env.FEATURE_FLAG_COLLECTIONS': JSON.stringify(process.env.FEATURE_FLAG_COLLECTIONS),
    },
  },
});
```

## Verifying Your Setup

Create a test endpoint to verify feature flags are working:

```typescript
// src/pages/api/feature-flags.ts
import { getAllFeatureFlags, getCurrentEnvironment } from '@/lib/features';

export async function GET() {
  return new Response(
    JSON.stringify({
      environment: getCurrentEnvironment(),
      flags: getAllFeatureFlags(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

Then visit `/api/feature-flags` to see your current configuration.

## Common Issues

### Issue: "Invalid environment" error

**Solution**: Make sure `ENV_NAME` is set to one of: `local`, `integration`, or `prod`

### Issue: Feature flags not updating

**Solution**: 
1. Restart your dev server after changing environment variables
2. Clear any build caches
3. Verify the environment variable is actually set (check `process.env.ENV_NAME`)

### Issue: Overrides not working

**Solution**: 
1. Make sure override variables are prefixed with `FEATURE_FLAG_`
2. Use uppercase feature names (e.g., `FEATURE_FLAG_AUTH`, not `FEATURE_FLAG_auth`)
3. Set values to string `'true'` or `'false'`, or boolean `true`/`false`
