/**
 * Tests for the feature flag system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isFeatureEnabled,
  getFeatureFlag,
  getAllFeatureFlags,
  getCurrentEnvironment,
  resetConfig,
  setEnvGetter,
} from './index';
import type { Environment } from './types';

// Mock environment storage
const mockEnv: Record<string, string | boolean | undefined> = {};

// Original env getter
const originalEnvGetter = (key: string) => import.meta.env[key] as string | undefined;

describe('Feature Flag System', () => {
  beforeEach(() => {
    // Reset environment and config before each test
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

  describe('getCurrentEnvironment', () => {
    it('should return local environment by default', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      expect(getCurrentEnvironment()).toBe('local');
    });

    it('should return integration environment', () => {
      mockEnv.ENV_NAME = 'integration';
      resetConfig();
      expect(getCurrentEnvironment()).toBe('integration');
    });

    it('should return prod environment', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      expect(getCurrentEnvironment()).toBe('prod');
    });

    it('should throw error for invalid environment', () => {
      mockEnv.ENV_NAME = 'invalid';
      resetConfig();
      expect(() => getCurrentEnvironment()).toThrow(
        'Invalid environment: invalid. Must be one of: local, integration, prod'
      );
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled features in local', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      expect(isFeatureEnabled('auth')).toBe(true);
      expect(isFeatureEnabled('collections')).toBe(true);
    });

    it('should respect integration environment config', () => {
      mockEnv.ENV_NAME = 'integration';
      resetConfig();
      expect(isFeatureEnabled('auth')).toBe(true);
      expect(isFeatureEnabled('collections')).toBe(false);
    });

    it('should respect prod environment config', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      expect(isFeatureEnabled('auth')).toBe(false);
      expect(isFeatureEnabled('collections')).toBe(false);
    });
  });

  describe('getFeatureFlag', () => {
    it('should return detailed flag information', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      
      const result = getFeatureFlag('auth');
      
      expect(result).toEqual({
        enabled: true,
        feature: 'auth',
        environment: 'local',
      });
    });

    it('should return correct info for disabled feature', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      const result = getFeatureFlag('collections');
      
      expect(result).toEqual({
        enabled: false,
        feature: 'collections',
        environment: 'prod',
      });
    });
  });

  describe('getAllFeatureFlags', () => {
    it('should return all flags for local environment', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      
      const flags = getAllFeatureFlags();
      
      expect(flags).toEqual({
        auth: true,
        collections: true,
      });
    });

    it('should return all flags for integration environment', () => {
      mockEnv.ENV_NAME = 'integration';
      resetConfig();
      
      const flags = getAllFeatureFlags();
      
      expect(flags).toEqual({
        auth: true,
        collections: false,
      });
    });

    it('should return all flags for prod environment', () => {
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      const flags = getAllFeatureFlags();
      
      expect(flags).toEqual({
        auth: false,
        collections: false,
      });
    });
  });

  describe('Environment variable overrides', () => {
    it('should override auth flag via environment variable', () => {
      mockEnv.ENV_NAME = 'local';
      mockEnv.FEATURE_FLAG_AUTH = 'false';
      resetConfig();
      
      expect(isFeatureEnabled('auth')).toBe(false);
    });

    it('should override collections flag via environment variable', () => {
      mockEnv.ENV_NAME = 'prod';
      mockEnv.FEATURE_FLAG_COLLECTIONS = 'true';
      resetConfig();
      
      expect(isFeatureEnabled('collections')).toBe(true);
    });

    it('should handle boolean true value', () => {
      mockEnv.ENV_NAME = 'prod';
      mockEnv.FEATURE_FLAG_AUTH = true;
      resetConfig();
      
      expect(isFeatureEnabled('auth')).toBe(true);
    });

    it('should handle boolean false value', () => {
      mockEnv.ENV_NAME = 'local';
      mockEnv.FEATURE_FLAG_AUTH = false;
      resetConfig();
      
      expect(isFeatureEnabled('auth')).toBe(false);
    });

    it('should override multiple flags', () => {
      mockEnv.ENV_NAME = 'prod';
      mockEnv.FEATURE_FLAG_AUTH = 'true';
      mockEnv.FEATURE_FLAG_COLLECTIONS = 'true';
      resetConfig();
      
      expect(isFeatureEnabled('auth')).toBe(true);
      expect(isFeatureEnabled('collections')).toBe(true);
    });
  });

  describe('Config caching', () => {
    it('should cache config after first load', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      
      const flags1 = getAllFeatureFlags();
      const flags2 = getAllFeatureFlags();
      
      // Should return the same object reference (cached)
      expect(flags1).toEqual(flags2);
    });

    it('should reload config after reset', () => {
      mockEnv.ENV_NAME = 'local';
      resetConfig();
      
      expect(isFeatureEnabled('auth')).toBe(true);
      
      // Change environment and reset
      mockEnv.ENV_NAME = 'prod';
      resetConfig();
      
      expect(isFeatureEnabled('auth')).toBe(false);
    });
  });
});
