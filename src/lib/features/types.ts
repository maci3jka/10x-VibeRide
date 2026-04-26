/**
 * Feature flag types and configuration
 */

/**
 * Supported environment names
 */
export type Environment = 'local' | 'integration' | 'prod';

/**
 * Available feature flags in the system
 */
export type FeatureFlag = 'auth' | 'collections';

/**
 * Feature flag configuration for a single environment
 */
export type FeatureFlagConfig = Record<FeatureFlag, boolean>;

/**
 * Complete feature flag configuration for all environments
 */
export type FeatureFlagsConfig = Record<Environment, FeatureFlagConfig>;

/**
 * Result of a feature flag check
 */
export interface FeatureFlagResult {
  enabled: boolean;
  feature: FeatureFlag;
  environment: Environment;
}
