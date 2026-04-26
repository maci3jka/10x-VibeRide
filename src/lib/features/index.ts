/**
 * Feature flag system for controlling feature visibility across environments
 * 
 * This module provides type-safe feature flag checking for both frontend and backend.
 * Features can be enabled/disabled per environment (local, integration, prod).
 * 
 * @example
 * ```typescript
 * // Check if a feature is enabled
 * if (isFeatureEnabled('auth')) {
 *   // Feature is enabled
 * }
 * 
 * // Get detailed flag information
 * const result = getFeatureFlag('collections');
 * console.log(result.enabled, result.environment);
 * 
 * // Get all flags for current environment
 * const flags = getAllFeatureFlags();
 * ```
 */

import { DEFAULT_CONFIG } from './config';
import type {
  Environment,
  FeatureFlag,
  FeatureFlagConfig,
  FeatureFlagResult,
} from './types';

/**
 * Environment getter function (can be overridden for testing)
 * @internal
 */
export let getEnvValue = (key: string): string | undefined => {
  return import.meta.env[key] as string | undefined;
};

/**
 * Override environment getter (for testing only)
 * @internal
 */
export function setEnvGetter(getter: (key: string) => string | undefined): void {
  getEnvValue = getter;
}

/**
 * Validates if the provided environment is valid
 */
function isValidEnvironment(env: string): env is Environment {
  return env === 'local' || env === 'integration' || env === 'prod';
}

/**
 * Gets the current environment
 * Reads from ENV_NAME environment variable, defaults to 'local'
 * @throws Error if ENV_NAME is invalid
 */
export function getCurrentEnvironment(): Environment {
  const currentEnv = (getEnvValue('ENV_NAME') || 'local') as string;
  
  if (!isValidEnvironment(currentEnv)) {
    throw new Error(
      `Invalid environment: ${currentEnv}. Must be one of: local, integration, prod`
    );
  }
  return currentEnv;
}

/**
 * Loads feature flag configuration with environment variable overrides
 * 
 * Environment variables can override default config using the pattern:
 * FEATURE_FLAG_<FEATURE_NAME>=true|false
 * 
 * Example: FEATURE_FLAG_AUTH=false
 */
function loadConfig(): FeatureFlagConfig {
  const env = getCurrentEnvironment();
  const baseConfig = { ...DEFAULT_CONFIG[env] };

  // Apply environment variable overrides
  const features: FeatureFlag[] = ['auth', 'collections'];
  
  for (const feature of features) {
    const envVarName = `FEATURE_FLAG_${feature.toUpperCase()}`;
    const envValue = getEnvValue(envVarName);
    
    if (envValue !== undefined) {
      baseConfig[feature] = envValue === 'true' || envValue === true;
    }
  }

  return baseConfig;
}

/**
 * Cached feature flag configuration
 */
let cachedConfig: FeatureFlagConfig | null = null;

/**
 * Gets the current feature flag configuration
 */
function getConfig(): FeatureFlagConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Checks if a feature is enabled in the current environment
 * 
 * @param feature - The feature flag to check
 * @returns true if the feature is enabled, false otherwise
 * 
 * @example
 * ```typescript
 * if (isFeatureEnabled('auth')) {
 *   // Show auth UI
 * }
 * ```
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  const config = getConfig();
  return config[feature];
}

/**
 * Gets detailed information about a feature flag
 * 
 * @param feature - The feature flag to check
 * @returns Feature flag result with enabled status, feature name, and environment
 * 
 * @example
 * ```typescript
 * const result = getFeatureFlag('collections');
 * console.log(`Collections is ${result.enabled ? 'enabled' : 'disabled'} in ${result.environment}`);
 * ```
 */
export function getFeatureFlag(feature: FeatureFlag): FeatureFlagResult {
  const config = getConfig();
  return {
    enabled: config[feature],
    feature,
    environment: getCurrentEnvironment(),
  };
}

/**
 * Gets all feature flags for the current environment
 * 
 * @returns Object containing all feature flags and their states
 * 
 * @example
 * ```typescript
 * const flags = getAllFeatureFlags();
 * console.log(flags); // { auth: true, collections: false }
 * ```
 */
export function getAllFeatureFlags(): FeatureFlagConfig {
  return { ...getConfig() };
}

/**
 * Resets the cached configuration (useful for testing)
 * @internal
 */
export function resetConfig(): void {
  cachedConfig = null;
}

// Re-export types for convenience
export type { Environment, FeatureFlag, FeatureFlagConfig, FeatureFlagResult } from './types';
