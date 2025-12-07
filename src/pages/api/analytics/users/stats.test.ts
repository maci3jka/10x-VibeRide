import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./stats";
import type { APIContext } from "astro";
import type { SupabaseClient } from "../../../../db/supabase.client";
import type { UserStatsResponse } from "../../../../types";

// Mock the service functions
vi.mock("../../../../lib/services/analyticsService", () => ({
  getUserStats: vi.fn(),
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

import { getUserStats } from "../../../../lib/services/analyticsService";
import { isServiceRole, isDevelopmentMode } from "../../../../lib/auth-helpers";

describe("GET /api/analytics/users/stats", () => {
  const mockSupabase = {} as SupabaseClient;
  const mockUser = { id: "550e8400-e29b-41d4-a716-446655440001", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    delete process.env.DEVENV;
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
        url: new URL("http://localhost/api/analytics/users/stats"),
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

      const mockStats: UserStatsResponse = {
        total_users: 100,
        users_with_completed_profiles: 75,
        profile_completion_rate: 0.75,
        active_users_30d: 50,
        new_users_30d: 10,
      };

      vi.mocked(getUserStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: null,
        },
        url: new URL("http://localhost/api/analytics/users/stats"),
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

      const mockStats: UserStatsResponse = {
        total_users: 100,
        users_with_completed_profiles: 75,
        profile_completion_rate: 0.75,
        active_users_30d: 50,
        new_users_30d: 10,
      };

      vi.mocked(getUserStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
      expect(getUserStats).toHaveBeenCalledWith(mockSupabase, {});
    });

    it("should accept valid 'from' query parameter", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const mockStats: UserStatsResponse = {
        total_users: 100,
        users_with_completed_profiles: 75,
        profile_completion_rate: 0.75,
        active_users_30d: 50,
        new_users_30d: 10,
      };

      vi.mocked(getUserStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats?from=2024-01-01T00:00:00.000Z"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
      expect(getUserStats).toHaveBeenCalledWith(mockSupabase, {
        from: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should accept valid 'to' query parameter", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const mockStats: UserStatsResponse = {
        total_users: 100,
        users_with_completed_profiles: 75,
        profile_completion_rate: 0.75,
        active_users_30d: 50,
        new_users_30d: 10,
      };

      vi.mocked(getUserStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats?to=2024-12-31T23:59:59.999Z"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
      expect(getUserStats).toHaveBeenCalledWith(mockSupabase, {
        to: "2024-12-31T23:59:59.999Z",
      });
    });

    it("should accept valid date range", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const mockStats: UserStatsResponse = {
        total_users: 100,
        users_with_completed_profiles: 75,
        profile_completion_rate: 0.75,
        active_users_30d: 50,
        new_users_30d: 10,
      };

      vi.mocked(getUserStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL(
          "http://localhost/api/analytics/users/stats?from=2024-01-01T00:00:00.000Z&to=2024-12-31T23:59:59.999Z"
        ),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
      expect(getUserStats).toHaveBeenCalledWith(mockSupabase, {
        from: "2024-01-01T00:00:00.000Z",
        to: "2024-12-31T23:59:59.999Z",
      });
    });

    it("should return 400 for invalid 'from' date format", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats?from=2024-01-01"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("validation_failed");
      expect(body.message).toBe("Invalid query parameters");
      expect(body.details).toBeDefined();
    });

    it("should return 400 for invalid 'to' date format", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats?to=not-a-date"),
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
          "http://localhost/api/analytics/users/stats?from=2024-12-31T23:59:59.999Z&to=2024-01-01T00:00:00.000Z"
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

    it("should return 200 with user statistics", async () => {
      const mockStats: UserStatsResponse = {
        total_users: 100,
        users_with_completed_profiles: 75,
        profile_completion_rate: 0.75,
        active_users_30d: 50,
        new_users_30d: 10,
      };

      vi.mocked(getUserStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStats);
      expect(body.total_users).toBe(100);
      expect(body.users_with_completed_profiles).toBe(75);
      expect(body.profile_completion_rate).toBe(0.75);
      expect(body.active_users_30d).toBe(50);
      expect(body.new_users_30d).toBe(10);
    });

    it("should return 200 with zero values when no users exist", async () => {
      const mockStats: UserStatsResponse = {
        total_users: 0,
        users_with_completed_profiles: 0,
        profile_completion_rate: 0,
        active_users_30d: 0,
        new_users_30d: 0,
      };

      vi.mocked(getUserStats).mockResolvedValue(mockStats);

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats"),
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
      vi.mocked(getUserStats).mockRejectedValue(new Error("Database connection failed"));

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("server_error");
      expect(body.message).toContain("Failed to fetch user statistics");
    });

    it("should include detailed error message in dev mode", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(true);
      vi.mocked(isServiceRole).mockResolvedValue(true);
      vi.mocked(getUserStats).mockRejectedValue(new Error("Database connection failed"));

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.message).toContain("Database connection failed");
    });

    it("should hide detailed error message in production mode", async () => {
      vi.mocked(isDevelopmentMode).mockReturnValue(false);
      vi.mocked(isServiceRole).mockResolvedValue(true);
      vi.mocked(getUserStats).mockRejectedValue(new Error("Database connection failed"));

      const context = {
        locals: {
          supabase: mockSupabase,
          user: mockUser,
        },
        url: new URL("http://localhost/api/analytics/users/stats"),
      } as unknown as APIContext;

      const response = await GET(context);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.message).not.toContain("Database connection failed");
      expect(body.message).toBe("Failed to fetch user statistics");
    });
  });
});
