/**
 * Example usage of the feature flag system
 * 
 * This file demonstrates how to use feature flags in different scenarios.
 * These are examples only - not meant to be imported or executed.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  isFeatureEnabled,
  getFeatureFlag,
  getAllFeatureFlags,
  getCurrentEnvironment,
} from './index';
import { guardApiEndpoint, guardPage, shouldShowFeature } from './guards';
import { createComingSoonResponse } from './errors';

// ============================================================================
// EXAMPLE 1: API Endpoint Protection
// ============================================================================

/**
 * Example: Protecting an authentication API endpoint
 * File: src/pages/api/auth/login.ts
 */
export async function exampleApiEndpoint(request: Request): Promise<Response> {
  // Guard the endpoint - returns Response if disabled, null if enabled
  const guard = guardApiEndpoint('auth');
  if (guard) return guard;

  // Feature is enabled, continue with normal logic
  const data = await request.json();
  
  // ... your authentication logic here ...
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Example: Protecting a collections API endpoint
 * File: src/pages/api/collections/index.ts
 */
export async function exampleCollectionsApi(): Promise<Response> {
  const guard = guardApiEndpoint('collections');
  if (guard) return guard;

  // ... your collections logic here ...
  
  return new Response(JSON.stringify({ collections: [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// EXAMPLE 2: Astro Page Protection
// ============================================================================

/**
 * Example: Protecting a login page
 * File: src/pages/auth/login.astro
 * 
 * Usage in Astro frontmatter:
 * ---
 * import { guardPage } from '@/lib/features/guards';
 * 
 * const guard = guardPage('auth', '/');
 * if (guard) return guard;
 * ---
 */
export function examplePageGuard(): Response | null {
  // Redirects to '/' if auth feature is disabled
  return guardPage('auth', '/');
}

/**
 * Example: Protecting a collections page with custom redirect
 * File: src/pages/collections/index.astro
 */
export function exampleCollectionsPageGuard(): Response | null {
  // Redirects to '/coming-soon' if collections feature is disabled
  return guardPage('collections', '/coming-soon');
}

// ============================================================================
// EXAMPLE 3: React Component Conditional Rendering
// ============================================================================

/**
 * Example: Conditionally showing navigation items
 * File: src/components/Navigation.tsx
 */
export function ExampleNavigation() {
  return (
    <nav>
      <a href="/">Home</a>
      
      {/* Show auth links only if feature is enabled */}
      {shouldShowFeature('auth') && (
        <>
          <a href="/auth/login">Login</a>
          <a href="/auth/signup">Sign Up</a>
        </>
      )}
      
      {/* Show collections link only if feature is enabled */}
      {shouldShowFeature('collections') && (
        <a href="/collections">My Collections</a>
      )}
    </nav>
  );
}

/**
 * Example: Conditionally rendering a feature section
 * File: src/components/Dashboard.tsx
 */
export function ExampleDashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {shouldShowFeature('collections') ? (
        <div>
          <h2>Your Collections</h2>
          {/* Collections content */}
        </div>
      ) : (
        <div>
          <p>Collections feature coming soon!</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Direct Flag Checking
// ============================================================================

/**
 * Example: Simple boolean check in a service
 * File: src/lib/services/userService.ts
 */
export function exampleServiceWithFlagCheck() {
  if (isFeatureEnabled('auth')) {
    // Perform auth-related operations
    console.log('Auth is enabled, proceeding with authentication');
  } else {
    console.log('Auth is disabled, skipping authentication');
  }
}

/**
 * Example: Conditional logic based on multiple flags
 */
export function exampleMultipleFlagCheck() {
  const hasAuth = isFeatureEnabled('auth');
  const hasCollections = isFeatureEnabled('collections');
  
  if (hasAuth && hasCollections) {
    console.log('Both features enabled - full functionality');
  } else if (hasAuth) {
    console.log('Only auth enabled - limited functionality');
  } else {
    console.log('Core features only');
  }
}

// ============================================================================
// EXAMPLE 5: Detailed Flag Information
// ============================================================================

/**
 * Example: Getting detailed flag information for logging
 */
export function exampleDetailedFlagInfo() {
  const authFlag = getFeatureFlag('auth');
  
  console.log(`Feature: ${authFlag.feature}`);
  console.log(`Enabled: ${authFlag.enabled}`);
  console.log(`Environment: ${authFlag.environment}`);
  
  // Example output:
  // Feature: auth
  // Enabled: true
  // Environment: local
}

/**
 * Example: Getting all flags for debugging
 */
export function exampleGetAllFlags() {
  const env = getCurrentEnvironment();
  const flags = getAllFeatureFlags();
  
  console.log(`Current environment: ${env}`);
  console.log('Feature flags:', flags);
  
  // Example output:
  // Current environment: local
  // Feature flags: { auth: true, collections: true }
}

// ============================================================================
// EXAMPLE 6: Custom Response Handling
// ============================================================================

/**
 * Example: Custom handling of disabled features in API
 */
export async function exampleCustomResponse(): Promise<Response> {
  if (!isFeatureEnabled('collections')) {
    // Use the standard coming soon response
    const response = createComingSoonResponse('collections');
    
    // Or create a custom response
    return new Response(
      JSON.stringify({
        ...response,
        estimatedAvailability: '2026-02-01',
        notifyUrl: '/api/notify-me',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  // Feature is enabled
  return new Response(JSON.stringify({ data: [] }));
}

// ============================================================================
// EXAMPLE 7: Middleware Usage
// ============================================================================

/**
 * Example: Using feature flags in Astro middleware
 * File: src/middleware/index.ts
 */
export function exampleMiddleware(request: Request): Response | null {
  const url = new URL(request.url);
  
  // Block all /auth/* routes if auth is disabled
  if (url.pathname.startsWith('/auth/')) {
    const guard = guardApiEndpoint('auth');
    if (guard) return guard;
  }
  
  // Block all /collections/* routes if collections is disabled
  if (url.pathname.startsWith('/collections/')) {
    const guard = guardApiEndpoint('collections');
    if (guard) return guard;
  }
  
  return null; // Continue to next middleware/handler
}

// ============================================================================
// EXAMPLE 8: React Hook for Feature Flags
// ============================================================================

/**
 * Example: Custom React hook for feature flags
 * File: src/lib/hooks/useFeatureFlag.ts
 */
export function useFeatureFlag(feature: 'auth' | 'collections') {
  // In a real implementation, this would use React hooks
  const enabled = isFeatureEnabled(feature);
  const flag = getFeatureFlag(feature);
  
  return {
    enabled,
    feature: flag.feature,
    environment: flag.environment,
  };
}

/**
 * Example: Using the custom hook in a component
 */
export function ExampleComponentWithHook() {
  const authFlag = useFeatureFlag('auth');
  
  if (!authFlag.enabled) {
    return <div>Authentication coming soon!</div>;
  }
  
  return (
    <div>
      <h1>Login</h1>
      {/* Auth UI */}
    </div>
  );
}
