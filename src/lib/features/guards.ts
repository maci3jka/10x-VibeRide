/**
 * Feature flag guards for protecting routes and API endpoints
 */

import { isFeatureEnabled } from './index';
import { createFeatureDisabledResponse } from './errors';
import type { FeatureFlag } from './types';

/**
 * Guard function for API endpoints
 * Returns a Response if the feature is disabled, null if enabled
 * 
 * @param feature - The feature flag to check
 * @returns Response with 503 status if disabled, null if enabled
 * 
 * @example
 * ```typescript
 * // In an API endpoint
 * export async function GET() {
 *   const guard = guardApiEndpoint('auth');
 *   if (guard) return guard;
 *   
 *   // Feature is enabled, continue with normal logic
 *   return new Response(JSON.stringify({ data: 'auth data' }));
 * }
 * ```
 */
export function guardApiEndpoint(feature: FeatureFlag): Response | null {
  if (!isFeatureEnabled(feature)) {
    return createFeatureDisabledResponse(feature);
  }
  return null;
}

/**
 * Guard function for Astro pages
 * Returns a redirect Response if the feature is disabled, null if enabled
 * 
 * @param feature - The feature flag to check
 * @param redirectTo - URL to redirect to if feature is disabled (defaults to '/')
 * @returns Redirect Response if disabled, null if enabled
 * 
 * @example
 * ```typescript
 * // In an Astro page
 * const guard = guardPage('collections');
 * if (guard) return guard;
 * ```
 */
export function guardPage(
  feature: FeatureFlag,
  redirectTo: string = '/'
): Response | null {
  if (!isFeatureEnabled(feature)) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
      },
    });
  }
  return null;
}

/**
 * Checks if a feature should be visible in the UI
 * 
 * @param feature - The feature flag to check
 * @returns true if the feature should be visible, false otherwise
 * 
 * @example
 * ```typescript
 * // In a React component
 * {shouldShowFeature('collections') && (
 *   <CollectionsLink />
 * )}
 * ```
 */
export function shouldShowFeature(feature: FeatureFlag): boolean {
  return isFeatureEnabled(feature);
}
