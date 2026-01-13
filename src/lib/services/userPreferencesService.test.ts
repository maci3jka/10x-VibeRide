import { describe, it, expect, vi, beforeEach } from "vitest";
import { upsertUserPreferences, getUserPreferences } from "./userPreferencesService";
import type { SupabaseClient } from "../../db/supabase.client";
import type { UpdateUserPreferencesInput } from "../validators/userPreferences";
import type { UserPreferencesResponse } from "../../types";

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockClient = {
    from: vi.fn(),
  };
  return mockClient as unknown as SupabaseClient;
};

describe("userPreferencesService", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe("upsertUserPreferences", () => {
    const userId = "test-user-id";
    const prefsInput: UpdateUserPreferencesInput = {
      terrain: "paved",
      road_type: "scenic",
      typical_duration_h: 2.5,
      typical_distance_km: 150.0,
    };

    const mockResponse: UserPreferencesResponse = {
      user_id: userId,
      terrain: "paved",
      road_type: "scenic",
      typical_duration_h: 2.5,
      typical_distance_km: 150.0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    it("should upsert user preferences successfully", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockResponse,
          error: null,
        }),
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      const result = await upsertUserPreferences(mockSupabase, userId, prefsInput);

      expect(mockSupabase.from).toHaveBeenCalledWith("user_preferences");
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: userId,
          terrain: "paved",
          road_type: "scenic",
          typical_duration_h: 2.5,
          typical_distance_km: 150.0,
          updated_at: expect.any(String),
        },
        {
          onConflict: "user_id",
        }
      );
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(result).toEqual(mockResponse);
    });

    it("should set updated_at timestamp", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockResponse,
          error: null,
        }),
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      const beforeCall = new Date().toISOString();
      await upsertUserPreferences(mockSupabase, userId, prefsInput);
      const afterCall = new Date().toISOString();

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.updated_at).toBeDefined();
      expect(upsertCall.updated_at >= beforeCall).toBe(true);
      expect(upsertCall.updated_at <= afterCall).toBe(true);
    });

    it("should use onConflict with user_id", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockResponse,
          error: null,
        }),
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      await upsertUserPreferences(mockSupabase, userId, prefsInput);

      expect(mockUpsert).toHaveBeenCalledWith(expect.any(Object), {
        onConflict: "user_id",
      });
    });

    it("should throw error when upsert fails", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: "Database constraint violation",
            code: "23505",
          },
        }),
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      await expect(upsertUserPreferences(mockSupabase, userId, prefsInput)).rejects.toThrow(
        "Failed to upsert user preferences"
      );
    });

    it("should include error code in error message", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: "Connection timeout",
            code: "PGRST301",
          },
        }),
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      await expect(upsertUserPreferences(mockSupabase, userId, prefsInput)).rejects.toThrow("(code: PGRST301)");
    });

    it("should throw error when no data returned", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      await expect(upsertUserPreferences(mockSupabase, userId, prefsInput)).rejects.toThrow(
        "No data returned from upsert operation"
      );
    });

    it("should handle all terrain types", async () => {
      const terrainTypes = ["paved", "gravel", "mixed", "offroad"];

      for (const terrain of terrainTypes) {
        const mockSelect = vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockResponse, terrain },
            error: null,
          }),
        });

        const mockUpsert = vi.fn().mockReturnValue({
          select: mockSelect,
        });

        vi.mocked(mockSupabase.from).mockReturnValue({
          upsert: mockUpsert,
        } as any);

        const result = await upsertUserPreferences(mockSupabase, userId, {
          ...prefsInput,
          terrain: terrain as any,
        });

        expect(result.terrain).toBe(terrain);
      }
    });

    it("should handle all road types", async () => {
      const roadTypes = ["scenic", "twisty", "fast", "mixed"];

      for (const roadType of roadTypes) {
        const mockSelect = vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockResponse, road_type: roadType },
            error: null,
          }),
        });

        const mockUpsert = vi.fn().mockReturnValue({
          select: mockSelect,
        });

        vi.mocked(mockSupabase.from).mockReturnValue({
          upsert: mockUpsert,
        } as any);

        const result = await upsertUserPreferences(mockSupabase, userId, {
          ...prefsInput,
          road_type: roadType as any,
        });

        expect(result.road_type).toBe(roadType);
      }
    });

    it("should handle decimal values correctly", async () => {
      const prefsWithDecimals: UpdateUserPreferencesInput = {
        terrain: "paved",
        road_type: "scenic",
        typical_duration_h: 3.75,
        typical_distance_km: 225.5,
      };

      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { ...mockResponse, ...prefsWithDecimals },
          error: null,
        }),
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      const result = await upsertUserPreferences(mockSupabase, userId, prefsWithDecimals);

      expect(result.typical_duration_h).toBe(3.75);
      expect(result.typical_distance_km).toBe(225.5);
    });
  });

  describe("getUserPreferences", () => {
    const userId = "test-user-id";

    const mockResponse: UserPreferencesResponse = {
      user_id: userId,
      terrain: "paved",
      road_type: "scenic",
      typical_duration_h: 2.5,
      typical_distance_km: 150.0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    it("should get user preferences successfully", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getUserPreferences(mockSupabase, userId);

      expect(mockSupabase.from).toHaveBeenCalledWith("user_preferences");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("user_id", userId);
      expect(result).toEqual(mockResponse);
    });

    it("should return null when preferences not found (PGRST116)", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: "No rows found",
          code: "PGRST116",
        },
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getUserPreferences(mockSupabase, userId);

      expect(result).toBeNull();
    });

    it("should throw error for database errors other than PGRST116", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: "Connection timeout",
          code: "PGRST301",
        },
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(getUserPreferences(mockSupabase, userId)).rejects.toThrow("Failed to fetch user preferences");
    });

    it("should throw error with original error message", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: "Database constraint violation",
          code: "23505",
        },
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(getUserPreferences(mockSupabase, userId)).rejects.toThrow("Database constraint violation");
    });

    it("should handle successful response with all fields", async () => {
      const completeResponse: UserPreferencesResponse = {
        user_id: "user-123",
        terrain: "gravel",
        road_type: "twisty",
        typical_duration_h: 4.0,
        typical_distance_km: 200.0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: completeResponse,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await getUserPreferences(mockSupabase, "user-123");

      expect(result).toEqual(completeResponse);
      expect(result?.terrain).toBe("gravel");
      expect(result?.road_type).toBe("twisty");
      expect(result?.typical_duration_h).toBe(4.0);
      expect(result?.typical_distance_km).toBe(200.0);
    });

    it("should query with correct user_id", async () => {
      const testUserId = "specific-user-id";

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await getUserPreferences(mockSupabase, testUserId);

      expect(mockEq).toHaveBeenCalledWith("user_id", testUserId);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle create then read flow", async () => {
      const userId = "new-user-id";
      const prefsInput: UpdateUserPreferencesInput = {
        terrain: "paved",
        road_type: "scenic",
        typical_duration_h: 2.5,
        typical_distance_km: 150.0,
      };

      const createdPrefs: UserPreferencesResponse = {
        user_id: userId,
        ...prefsInput,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Mock upsert (create)
      const mockUpsertSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: createdPrefs,
          error: null,
        }),
      });

      const mockUpsert = vi.fn().mockReturnValue({
        select: mockUpsertSelect,
      });

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        upsert: mockUpsert,
      } as any);

      // Create preferences
      const createResult = await upsertUserPreferences(mockSupabase, userId, prefsInput);
      expect(createResult).toEqual(createdPrefs);

      // Mock get
      const mockGetSingle = vi.fn().mockResolvedValue({
        data: createdPrefs,
        error: null,
      });

      const mockGetEq = vi.fn().mockReturnValue({
        single: mockGetSingle,
      });

      const mockGetSelect = vi.fn().mockReturnValue({
        eq: mockGetEq,
      });

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        select: mockGetSelect,
      } as any);

      // Read preferences
      const getResult = await getUserPreferences(mockSupabase, userId);
      expect(getResult).toEqual(createdPrefs);
    });

    it("should handle update flow with different values", async () => {
      const userId = "existing-user-id";

      const originalPrefs: UpdateUserPreferencesInput = {
        terrain: "paved",
        road_type: "scenic",
        typical_duration_h: 2.5,
        typical_distance_km: 150.0,
      };

      const updatedPrefs: UpdateUserPreferencesInput = {
        terrain: "gravel",
        road_type: "twisty",
        typical_duration_h: 4.0,
        typical_distance_km: 250.0,
      };

      // Mock first upsert
      const mockFirstSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: userId,
            ...originalPrefs,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      });

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        upsert: vi.fn().mockReturnValue({
          select: mockFirstSelect,
        }),
      } as any);

      await upsertUserPreferences(mockSupabase, userId, originalPrefs);

      // Mock second upsert (update)
      const mockSecondSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: userId,
            ...updatedPrefs,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
          },
          error: null,
        }),
      });

      vi.mocked(mockSupabase.from).mockReturnValueOnce({
        upsert: vi.fn().mockReturnValue({
          select: mockSecondSelect,
        }),
      } as any);

      const result = await upsertUserPreferences(mockSupabase, userId, updatedPrefs);

      expect(result.terrain).toBe("gravel");
      expect(result.road_type).toBe("twisty");
      expect(result.typical_duration_h).toBe(4.0);
      expect(result.typical_distance_km).toBe(250.0);
    });
  });
});
