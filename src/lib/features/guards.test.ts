/**
 * Tests for feature flag guards
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { guardApiEndpoint, guardPage, shouldShowFeature } from './guards';
import { resetConfig, setEnvGetter } from './index';

// Mock environment storage
const mockEnv: Record<string, string | boolean | undefined> = {};

// Original env getter
const originalEnvGetter = (key: string) => import.meta.env[key] as string | undefined;

describe('Feature Flag Guards', () => {
  beforeEach(() => {
    Object.keys(mockEnv).forEach((key) => delete mockEnv[key]);
    mockEnv.ENV_NAME = 'local';
    
    // Set up mock environment getter
    setEnvGetter((key: string) => {
      const value = mockEnv[key];
      return value === undefined ? undefined : String(value);
    });
    
    resetConfig();
  });

  afterEach(() => {
    // Restore original env getter
    setEnvGetter(originalEnvGetter);
  });

  describe('guardApiEndpoint', () => {
    it('should return null when feature is enabled', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      
      const result = guardApiEndpoint('auth');
      
      expect(result).toBeNull();
    });

    it('should return Response when feature is disabled', async () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      const result = guardApiEndpoint('auth');
      
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(503);
      
      const body = await result?.json();
      expect(body).toEqual({
        error: 'FEATURE_DISABLED',
        message: 'The auth feature is coming soon. Stay tuned!',
        feature: 'auth',
        comingSoon: true,
      });
    });

    it('should include Retry-After header', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      const result = guardApiEndpoint('collections');
      
      expect(result?.headers.get('Retry-After')).toBe('3600');
    });

    it('should include Content-Type header', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      const result = guardApiEndpoint('collections');
      
      expect(result?.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('guardPage', () => {
    it('should return null when feature is enabled', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      
      const result = guardPage('auth');
      
      expect(result).toBeNull();
    });

    it('should return redirect Response when feature is disabled', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      const result = guardPage('auth');
      
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(302);
      expect(result?.headers.get('Location')).toBe('/');
    });

    it('should redirect to custom URL', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      const result = guardPage('collections', '/coming-soon');
      
      expect(result?.headers.get('Location')).toBe('/coming-soon');
    });

    it('should use default redirect URL', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      const result = guardPage('auth');
      
      expect(result?.headers.get('Location')).toBe('/');
    });
  });

  describe('shouldShowFeature', () => {
    it('should return true when feature is enabled', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      
      expect(shouldShowFeature('auth')).toBe(true);
      expect(shouldShowFeature('collections')).toBe(true);
    });

    it('should return false when feature is disabled', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      expect(shouldShowFeature('auth')).toBe(false);
      expect(shouldShowFeature('collections')).toBe(false);
    });

    it('should respect environment-specific config', () => {
      mockEnv.ENV_NAME = 'integration';
      resetConfig();
      
      expect(shouldShowFeature('auth')).toBe(true);
      expect(shouldShowFeature('collections')).toBe(false);
    });
  });
});
