/**
 * Feature flag configuration for all environments
 */

import type { FeatureFlagsConfig } from './types';

/**
 * Default feature flag configuration
 * 
 * This configuration defines which features are enabled in each environment.
 * Flags can be overridden via environment variables using the pattern:
 * FEATURE_FLAG_<FEATURE_NAME>=true|false
 * 
 * Example: FEATURE_FLAG_AUTH=false
 */
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
