/**
 * Feature flag error handling and responses
 */

import type { FeatureFlag } from './types';

/**
 * Error thrown when a disabled feature is accessed
 */
export class FeatureDisabledError extends Error {
  constructor(
    public readonly feature: FeatureFlag,
    public readonly environment: string
  ) {
    super(`Feature "${feature}" is disabled in ${environment} environment`);
    this.name = 'FeatureDisabledError';
  }
}

/**
 * Standard response for disabled features
 */
export interface FeatureDisabledResponse {
  error: 'FEATURE_DISABLED';
  message: string;
  feature: FeatureFlag;
  comingSoon: true;
}

/**
 * Creates a standardized "coming soon" response for disabled features
 * 
 * @param feature - The disabled feature
 * @returns Response object with coming soon message
 * 
 * @example
 * ```typescript
 * if (!isFeatureEnabled('collections')) {
 *   return new Response(
 *     JSON.stringify(createComingSoonResponse('collections')),
 *     { status: 503, headers: { 'Content-Type': 'application/json' } }
 *   );
 * }
 * ```
 */
export function createComingSoonResponse(feature: FeatureFlag): FeatureDisabledResponse {
  return {
    error: 'FEATURE_DISABLED',
    message: `The ${feature} feature is coming soon. Stay tuned!`,
    feature,
    comingSoon: true,
  };
}

/**
 * Creates a standardized HTTP Response for disabled features (API endpoints)
 * 
 * @param feature - The disabled feature
 * @returns HTTP Response with 503 status and coming soon message
 * 
 * @example
 * ```typescript
 * if (!isFeatureEnabled('auth')) {
 *   return createFeatureDisabledResponse('auth');
 * }
 * ```
 */
export function createFeatureDisabledResponse(feature: FeatureFlag): Response {
  return new Response(JSON.stringify(createComingSoonResponse(feature)), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '3600', // Suggest retry after 1 hour
    },
  });
}
