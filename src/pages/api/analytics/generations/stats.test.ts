import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./stats";
import type { APIContext } from "astro";
import type { SupabaseClient } from "../../../../db/supabase.client";
import type { GenerationStatsResponse } from "../../../../types";

// Mock the service functions
vi.mock("../../../../lib/services/analyticsService", () => ({
  getGenerationStats: vi.fn(),
}));

// Mock the logger
vi.mock("../../../../lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the auth helpers
vi.mock("../../../../lib/auth-helpers", () => ({
  isServiceRole: vi.fn(),
  isDevelopmentMode: vi.fn(),
}));

import { getGenerationStats } from "../../../../lib/services/analyticsService";
import { isServiceRole, isDevelopmentMode } from "../../../../lib/auth-helpers";

describe("GET /api/analytics/generations/stats", () => {
  const mockSupabase = {} as SupabaseClient;
  const mockUser = { id: "550e8400-e29b-41d4-a716-446655440001", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("should return 403 if service role authentication fails", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(false);
      vi.mocked(isServiceRole).mockResolvedValue(false);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: null,
        },
        url: new URL("http://localhost/api/analytics/generations/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe("forbidden");
      expect(body.message).toContain("Service role authentication required");
    });

    it("should allow access in dev mode with service role", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const mockStats: GenerationStatsResponse = {
        total_generations: 100,
        completed_generations: 80,
        failed_generations: 15,
        cancelled_generations: 5,
        failure_rate: 0.15,
        avg_generation_time_seconds: 45.5,
        p95_generation_time_seconds: 120.0,
        generations_per_user: {
          mean: 2.5,
          median: 2.0,
          users_with_3_plus: 15,
        },
        estimated_cost_usd: 0.8,
      };

      vi.mocked(getGenerationStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: null,
        },
        url: new URL("http://localhost/api/analytics/generations/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
    });
  });

  describe("query parameter validation", () => {
    it("should accept request without query parameters", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const mockStats: GenerationStatsResponse = {
        total_generations: 100,
        completed_generations: 80,
        failed_generations: 15,
        cancelled_generations: 5,
        failure_rate: 0.15,
        avg_generation_time_seconds: 45.5,
        p95_generation_time_seconds: 120.0,
        generations_per_user: {
          mean: 2.5,
          median: 2.0,
          users_with_3_plus: 15,
        },
        estimated_cost_usd: 0.8,
      };

      vi.mocked(getGenerationStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/generations/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
      expect(getGenerationStats).toHaveBeenCalledWith(mockSupabase, {});
    });

    it("should accept valid date range", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const mockStats: GenerationStatsResponse = {
        total_generations: 50,
        completed_generations: 40,
        failed_generations: 8,
        cancelled_generations: 2,
        failure_rate: 0.16,
        avg_generation_time_seconds: 42.0,
        p95_generation_time_seconds: 110.0,
        generations_per_user: {
          mean: 2.0,
          median: 1.5,
          users_with_3_plus: 8,
        },
        estimated_cost_usd: 0.4,
      };

      vi.mocked(getGenerationStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL(
          "http://localhost/api/analytics/generations/stats?from=2024-01-01T00:00:00.000Z&to=2024-12-31T23:59:59.999Z"
        ),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
      expect(getGenerationStats).toHaveBeenCalledWith(mockSupabase, {
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-12-31T23:59:59.999Z",
      });
    });

    it("should return 400 for invalid date format", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/generations/stats?from=invalid-date"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("validation_failed");
      expect(body.message).toBe("Invalid query parameters");
    });

    it("should return 400 when 'from' is after 'to'", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL(
          "http://localhost/api/analytics/generations/stats?from=2024-12-31T23:59:59.999Z&to=2024-01-01T00:00:00.000Z"
        ),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("validation_failed");
      expect(body.details?.from).toContain("before or equal");
    });
  });

  describe("success responses", () => {
    beforeEach(() => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);
    });

    it("should return 200 with generation statistics", async () => {
      const mockStats: GenerationStatsResponse = {
        total_generations: 100,
        completed_generations: 80,
        failed_generations: 15,
        cancelled_generations: 5,
        failure_rate: 0.15,
        avg_generation_time_seconds: 45.5,
        p95_generation_time_seconds: 120.0,
        generations_per_user: {
          mean: 2.5,
          median: 2.0,
          users_with_3_plus: 15,
        },
        estimated_cost_usd: 0.8,
      };

      vi.mocked(getGenerationStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/generations/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
      expect(body.total_generations).toBe(100);
      expect(body.completed_generations).toBe(80);
      expect(body.failed_generations).toBe(15);
      expect(body.cancelled_generations).toBe(5);
      expect(body.failure_rate).toBe(0.15);
      expect(body.avg_generation_time_seconds).toBe(45.5);
      expect(body.p95_generation_time_seconds).toBe(120.0);
      expect(body.generations_per_user.mean).toBe(2.5);
      expect(body.generations_per_user.median).toBe(2.0);
      expect(body.generations_per_user.users_with_3_plus).toBe(15);
      expect(body.estimated_cost_usd).toBe(0.8);
    });

    it("should return 200 with zero values when no generations exist", async () => {
      const mockStats: GenerationStatsResponse = {
        total_generations: 0,
        completed_generations: 0,
        failed_generations: 0,
        cancelled_generations: 0,
        failure_rate: 0,
        avg_generation_time_seconds: 0,
        p95_generation_time_seconds: 0,
        generations_per_user: {
          mean: 0,
          median: 0,
          users_with_3_plus: 0,
        },
        estimated_cost_usd: 0,
      };

      vi.mocked(getGenerationStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/generations/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);
    });

    it("should return 500 on service error", async () => {
      vi.mocked(getGenerationStats).mockRejectedValue(new Error("Database query timeout"));

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/generations/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("server_error");
      expect(body.message).toContain("Failed to fetch generation statistics");
    });

    it("should include detailed error message in dev mode", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);
      vi.mocked(getGenerationStats).mockRejectedValue(new Error("Database query timeout"));

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/generations/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.message).toContain("Database query timeout");
    });

    it("should hide detailed error message in production mode", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(false);
      vi.mocked(isServiceRole).mockResolvedValue(true);
      vi.mocked(getGenerationStats).mockRejectedValue(new Error("Database query timeout"));

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/generations/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.message).not.toContain("Database query timeout");
      expect(body.message).toBe("Failed to fetch generation statistics");
    });
  });
});
