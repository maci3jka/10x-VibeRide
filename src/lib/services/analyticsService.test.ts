import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserStats, getGenerationStats } from "./analyticsService";
import type { SupabaseClient } from "../../db/supabase.client";

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockClient = {
    schema: vi.fn(),
    from: vi.fn(),
  };

  // Chain methods for query building
  const createQueryChain = (mockData: any) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue(mockData),
  });

  return mockClient as unknown as SupabaseClient;
};

describe("analyticsService", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe("getUserStats", () => {
    it("should return correct user statistics with all data", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Mock total users count
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        }),
      } as any);

      // Mock users with profiles count
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          count: 90,
          error: null,
        }),
      } as any);

      // Mock active users count
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 50,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock new users count
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 20,
              error: null,
            }),
          }),
        }),
      } as any);

      const stats = await getUserStats(mockSupabase);

      expect(stats).toEqual({
        total_users: 100,
        users_with_completed_profiles: 90,
        profile_completion_rate: 0.9,
        active_users_30d: 50,
        new_users_30d: 20,
      });
    });

    it("should handle zero total users", async () => {
      // Mock total users count
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            count: 0,
            error: null,
          }),
        }),
      } as any);

      // Mock users with profiles count
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      } as any);

      // Mock active users count
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock new users count
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        }),
      } as any);

      const stats = await getUserStats(mockSupabase);

      expect(stats.total_users).toBe(0);
      expect(stats.profile_completion_rate).toBe(0);
    });

    it("should calculate profile completion rate correctly", async () => {
      // 75 out of 100 users have profiles
      vi.mocked(mockSupabase.schema).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 10,
              error: null,
            }),
          }),
        }),
      } as any);

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          count: 75,
          error: null,
        }),
      } as any);

      // Override first call for total users
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        }),
      } as any);

      const stats = await getUserStats(mockSupabase);

      expect(stats.profile_completion_rate).toBe(0.75);
    });

    it("should apply date range filter for new users", async () => {
      const from = "2024-01-01T00:00:00Z";
      const to = "2024-01-31T23:59:59Z";

      const mockGte = vi.fn().mockReturnValue({
        lte: vi.fn().mockResolvedValue({
          count: 15,
          error: null,
        }),
      });

      // Setup mocks for all queries
      vi.mocked(mockSupabase.schema).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: mockGte,
          }),
        }),
      } as any);

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          count: 50,
          error: null,
        }),
      } as any);

      await getUserStats(mockSupabase, { from, to });

      // Verify date range was applied
      expect(mockGte).toHaveBeenCalledWith("created_at", from);
    });

    it("should throw error when total users query fails", async () => {
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            count: null,
            error: { message: "Database error", code: "500" },
          }),
        }),
      } as any);

      await expect(getUserStats(mockSupabase)).rejects.toThrow("Failed to count total users");
    });

    it("should throw error when profiles query fails", async () => {
      vi.mocked(mockSupabase.schema).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            count: 100,
            error: null,
          }),
        }),
      } as any);

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          count: null,
          error: { message: "Database error", code: "500" },
        }),
      } as any);

      await expect(getUserStats(mockSupabase)).rejects.toThrow("Failed to count users with profiles");
    });

    it("should handle null counts as zero", async () => {
      vi.mocked(mockSupabase.schema).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: null,
              error: null,
            }),
          }),
        }),
      } as any);

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          count: null,
          error: null,
        }),
      } as any);

      const stats = await getUserStats(mockSupabase);

      expect(stats.total_users).toBe(0);
      expect(stats.users_with_completed_profiles).toBe(0);
      expect(stats.active_users_30d).toBe(0);
      expect(stats.new_users_30d).toBe(0);
    });
  });

  describe("getGenerationStats", () => {
    it("should return correct generation statistics", async () => {
      // Mock total generations
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          count: 100,
          error: null,
        }),
      } as any);

      // Mock completed generations
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 80,
            error: null,
          }),
        }),
      } as any);

      // Mock failed generations
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 15,
            error: null,
          }),
        }),
      } as any);

      // Mock cancelled generations
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 5,
            error: null,
          }),
        }),
      } as any);

      // Mock timing data
      const timingData = [
        { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:01:00Z" }, // 60s
        { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:02:00Z" }, // 120s
        { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:03:00Z" }, // 180s
      ];

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: timingData,
            error: null,
          }),
        }),
      } as any);

      // Mock per-user data
      const perUserData = [
        { user_id: "user-1" },
        { user_id: "user-1" },
        { user_id: "user-1" },
        { user_id: "user-2" },
        { user_id: "user-2" },
        { user_id: "user-3" },
      ];

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: perUserData,
          error: null,
        }),
      } as any);

      const stats = await getGenerationStats(mockSupabase);

      expect(stats.total_generations).toBe(100);
      expect(stats.completed_generations).toBe(80);
      expect(stats.failed_generations).toBe(15);
      expect(stats.cancelled_generations).toBe(5);
      expect(stats.failure_rate).toBe(0.15);
      expect(stats.avg_generation_time_seconds).toBe(120); // (60+120+180)/3
      expect(stats.estimated_cost_usd).toBe(0.8); // 80 * 0.01
    });

    it("should calculate p95 generation time correctly", async () => {
      // Setup mocks for count queries
      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ count: 100, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 80, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 15, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        } as any);

      // Create 100 timing samples
      const timingData = Array.from({ length: 100 }, (_, i) => ({
        created_at: "2024-01-01T00:00:00Z",
        updated_at: new Date(new Date("2024-01-01T00:00:00Z").getTime() + (i + 1) * 1000).toISOString(),
      }));

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: timingData,
            error: null,
          }),
        }),
      } as any);

      // Mock per-user data
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const stats = await getGenerationStats(mockSupabase);

      // P95 of 1-100 seconds: 95th percentile index = floor(100 * 0.95) = 95
      // In 0-indexed sorted array [1,2,...,100], index 95 = value 96
      expect(stats.p95_generation_time_seconds).toBe(96);
    });

    it("should handle zero total generations", async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 0,
            data: [],
            error: null,
          }),
        }),
      } as any);

      const stats = await getGenerationStats(mockSupabase);

      expect(stats.total_generations).toBe(0);
      expect(stats.failure_rate).toBe(0);
      expect(stats.avg_generation_time_seconds).toBe(0);
      expect(stats.p95_generation_time_seconds).toBe(0);
    });

    it("should calculate failure rate correctly", async () => {
      // 20 failed out of 100 total
      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ count: 100, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 75, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 20, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any);

      const stats = await getGenerationStats(mockSupabase);

      expect(stats.failure_rate).toBe(0.2);
    });

    it("should calculate generations per user statistics", async () => {
      // Setup count mocks
      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ count: 100, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 80, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 15, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as any);

      // User 1: 5 generations, User 2: 3 generations, User 3: 2 generations, User 4: 1 generation
      const perUserData = [
        ...Array(5).fill({ user_id: "user-1" }),
        ...Array(3).fill({ user_id: "user-2" }),
        ...Array(2).fill({ user_id: "user-3" }),
        { user_id: "user-4" },
      ];

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: perUserData,
          error: null,
        }),
      } as any);

      const stats = await getGenerationStats(mockSupabase);

      // Mean: (5+3+2+1)/4 = 2.75
      expect(stats.generations_per_user.mean).toBe(2.75);
      // Median: (2+3)/2 = 2.5
      expect(stats.generations_per_user.median).toBe(2.5);
      // Users with 3+: user-1 (5) and user-2 (3) = 2 users
      expect(stats.generations_per_user.users_with_3_plus).toBe(2);
    });

    it("should calculate median correctly for odd number of users", async () => {
      // Setup count mocks
      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ count: 100, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 80, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 15, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as any);

      // User 1: 5, User 2: 3, User 3: 1 (median should be 3)
      const perUserData = [
        ...Array(5).fill({ user_id: "user-1" }),
        ...Array(3).fill({ user_id: "user-2" }),
        { user_id: "user-3" },
      ];

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: perUserData,
          error: null,
        }),
      } as any);

      const stats = await getGenerationStats(mockSupabase);

      expect(stats.generations_per_user.median).toBe(3);
    });

    it("should handle empty timing data", async () => {
      // Setup count mocks
      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ count: 10, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        } as any);

      // Empty timing data
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any);

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const stats = await getGenerationStats(mockSupabase);

      expect(stats.avg_generation_time_seconds).toBe(0);
      expect(stats.p95_generation_time_seconds).toBe(0);
    });

    it("should apply date range filters", async () => {
      const from = "2024-01-01T00:00:00Z";
      const to = "2024-01-31T23:59:59Z";

      const mockGte = vi.fn().mockReturnValue({
        lte: vi.fn().mockResolvedValue({
          count: 50,
          data: [],
          error: null,
        }),
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: mockGte,
          }),
          gte: mockGte,
        }),
      } as any);

      await getGenerationStats(mockSupabase, { from, to });

      expect(mockGte).toHaveBeenCalledWith("created_at", from);
    });

    it("should throw error when query fails", async () => {
      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          count: null,
          error: { message: "Database error", code: "500" },
        }),
      } as any);

      await expect(getGenerationStats(mockSupabase)).rejects.toThrow("Failed to count total generations");
    });

    it("should filter out invalid durations (negative or zero)", async () => {
      // Setup count mocks
      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ count: 100, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 80, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 15, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        } as any);

      // Include some invalid timing data
      const timingData = [
        { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:01:00Z" }, // 60s - valid
        { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }, // 0s - invalid
        { created_at: "2024-01-01T00:01:00Z", updated_at: "2024-01-01T00:00:00Z" }, // negative - invalid
        { created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:02:00Z" }, // 120s - valid
      ];

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: timingData,
            error: null,
          }),
        }),
      } as any);

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const stats = await getGenerationStats(mockSupabase);

      // Should only average valid durations: (60+120)/2 = 90
      expect(stats.avg_generation_time_seconds).toBe(90);
    });

    it("should handle null data arrays", async () => {
      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any);

      const stats = await getGenerationStats(mockSupabase);

      expect(stats.generations_per_user.mean).toBe(0);
      expect(stats.generations_per_user.median).toBe(0);
      expect(stats.generations_per_user.users_with_3_plus).toBe(0);
    });
  });
});
