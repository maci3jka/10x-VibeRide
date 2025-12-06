import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProfileState } from "./useProfileState";
import { useUserPreferences } from "./useUserPreferences";
import type { UserPreferencesResponse, ErrorResponse } from "@/types";

// Mock useUserPreferences hook
vi.mock("./useUserPreferences");

describe("useProfileState", () => {
  // Mock functions for useUserPreferences
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockUpsert: ReturnType<typeof vi.fn>;

  // Sample test data
  const mockServerData: UserPreferencesResponse = {
    user_id: "test-user-id",
    terrain: "paved",
    road_type: "scenic",
    typical_duration_h: 2.5,
    typical_distance_km: 150.0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockErrorResponse: ErrorResponse = {
    error: "server_error",
    message: "Failed to save preferences",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockFetch = vi.fn();
    mockUpsert = vi.fn();

    vi.mocked(useUserPreferences).mockReturnValue({
      data: null,
      error: null,
      isFetching: false,
      isMutating: false,
      fetch: mockFetch,
      upsert: mockUpsert,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with empty form values", async () => {
      // Set isFetching to true to capture loading state
      vi.mocked(useUserPreferences).mockReturnValue({
        data: null,
        error: null,
        isFetching: true,
        isMutating: false,
        fetch: mockFetch,
        upsert: mockUpsert,
      });

      const { result } = renderHook(() => useProfileState());

      expect(result.current.form).toEqual({
        terrain: "",
        road_type: "",
        typical_duration_h: "",
        typical_distance_km: "",
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.status).toBe("loading");
    });

    it("should call fetch on mount", () => {
      renderHook(() => useProfileState());

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should set status to 'loading' when isFetching is true", () => {
      vi.mocked(useUserPreferences).mockReturnValue({
        data: null,
        error: null,
        isFetching: true,
        isMutating: false,
        fetch: mockFetch,
        upsert: mockUpsert,
      });

      const { result } = renderHook(() => useProfileState());

      expect(result.current.status).toBe("loading");
    });
  });

  describe("Data Loading", () => {
    it("should populate form with server data when fetched", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      // Simulate data fetch
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: mockServerData,
          error: null,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.form).toEqual({
          terrain: "paved",
          road_type: "scenic",
          typical_duration_h: "2.5",
          typical_distance_km: "150",
        });
        expect(result.current.status).toBe("ready");
        expect(result.current.serverData).toEqual(mockServerData);
      });
    });

    it("should set status to 'ready' for first-time user (no data)", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      // Simulate no data (404 response)
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: null,
          error: null,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe("ready");
        expect(result.current.serverData).toBeUndefined();
      });
    });

    it("should set status to 'error' when fetch fails", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      // Simulate fetch error
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: null,
          error: mockErrorResponse,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe("error");
        expect(result.current.apiError).toEqual(mockErrorResponse);
      });
    });
  });

  describe("Form Field Updates", () => {
    it("should update a single field", async () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "gravel");
      });

      expect(result.current.form.terrain).toBe("gravel");
    });

    it("should clear error for updated field", async () => {
      const { result } = renderHook(() => useProfileState());

      // Set an error
      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.terrain).toBeDefined();

      // Update field should clear the error
      act(() => {
        result.current.updateField("terrain", "paved");
      });

      expect(result.current.errors.terrain).toBeUndefined();
    });

    it("should not affect other fields when updating one field", async () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "twisty");
      });

      act(() => {
        result.current.updateField("terrain", "gravel");
      });

      expect(result.current.form.terrain).toBe("gravel");
      expect(result.current.form.road_type).toBe("twisty");
    });
  });

  describe("Validation", () => {
    it("should return false and set errors when required fields are empty", () => {
      const { result } = renderHook(() => useProfileState());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors).toEqual({
        terrain: "Terrain is required",
        road_type: "Road type is required",
        typical_duration_h: "Typical duration is required",
        typical_distance_km: "Typical distance is required",
      });
    });

    it("should validate terrain enum values", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "2.5");
        result.current.updateField("typical_distance_km", "150");
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it("should reject duration exceeding max value (999.9)", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "1000");
        result.current.updateField("typical_distance_km", "150");
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.typical_duration_h).toBe("Typical duration cannot exceed 999.9 hours");
    });

    it("should reject distance exceeding max value (999999.9)", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "2.5");
        result.current.updateField("typical_distance_km", "1000000");
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.typical_distance_km).toBe("Typical distance cannot exceed 999999.9 km");
    });

    it("should reject negative duration values", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "-1");
        result.current.updateField("typical_distance_km", "150");
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.typical_duration_h).toBe("Typical duration must be greater than 0");
    });

    it("should reject zero values", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "0");
        result.current.updateField("typical_distance_km", "0");
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.typical_duration_h).toBe("Typical duration must be greater than 0");
      expect(result.current.errors.typical_distance_km).toBe("Typical distance must be greater than 0");
    });

    it("should accept decimal values", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "2.5");
        result.current.updateField("typical_distance_km", "150.7");
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it("should clear all errors when validation passes", () => {
      const { result } = renderHook(() => useProfileState());

      // First trigger validation errors
      act(() => {
        result.current.validate();
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      // Fill in valid data
      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "2.5");
        result.current.updateField("typical_distance_km", "150");
      });

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors).toEqual({});
    });
  });

  describe("Dirty State Detection", () => {
    it("should be dirty when any field is filled for first-time user", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
      });

      expect(result.current.isDirty).toBe(true);
    });

    it("should not be dirty when form matches server data", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      // Load server data
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: mockServerData,
          error: null,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });
    });

    it("should be dirty when form differs from server data", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      // Load server data
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: mockServerData,
          error: null,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      // Modify a field
      act(() => {
        result.current.updateField("terrain", "gravel");
      });

      expect(result.current.isDirty).toBe(true);
    });

    it("should detect numeric field changes correctly", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      // Load server data
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: mockServerData,
          error: null,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      // Change numeric field
      act(() => {
        result.current.updateField("typical_duration_h", "3.0");
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("Save Operation", () => {
    it("should return false if validation fails", async () => {
      const { result } = renderHook(() => useProfileState());

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult!).toBe(false);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("should call upsert with correct payload on valid data", async () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "2.5");
        result.current.updateField("typical_distance_km", "150.5");
      });

      mockUpsert.mockResolvedValue(mockServerData);

      await act(async () => {
        await result.current.save();
      });

      expect(mockUpsert).toHaveBeenCalledWith({
        terrain: "paved",
        road_type: "scenic",
        typical_duration_h: 2.5,
        typical_distance_km: 150.5,
      });
    });

    it("should convert string values to numbers in payload", async () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "gravel");
        result.current.updateField("road_type", "twisty");
        result.current.updateField("typical_duration_h", "4.75");
        result.current.updateField("typical_distance_km", "300.25");
      });

      mockUpsert.mockResolvedValue(mockServerData);

      await act(async () => {
        await result.current.save();
      });

      const callArgs = mockUpsert.mock.calls[0][0];
      expect(typeof callArgs.typical_duration_h).toBe("number");
      expect(typeof callArgs.typical_distance_km).toBe("number");
      expect(callArgs.typical_duration_h).toBe(4.75);
      expect(callArgs.typical_distance_km).toBe(300.25);
    });

    it("should update serverData and status on successful save", async () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "2.5");
        result.current.updateField("typical_distance_km", "150");
      });

      mockUpsert.mockResolvedValue(mockServerData);

      await act(async () => {
        await result.current.save();
      });

      // After save completes, status should be success and serverData updated
      expect(result.current.status).toBe("success");
      expect(result.current.serverData).toEqual(mockServerData);
    });

    it("should set status to 'error' on save failure", async () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "2.5");
        result.current.updateField("typical_distance_km", "150");
      });

      mockUpsert.mockResolvedValue(null);

      await act(async () => {
        await result.current.save();
      });

      expect(result.current.status).toBe("error");
    });

    it("should set status to 'saving' during mutation", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "2.5");
        result.current.updateField("typical_distance_km", "150");
      });

      mockUpsert.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockServerData), 100);
          })
      );

      // Start save operation
      act(() => {
        result.current.save();
      });

      // Simulate isMutating state
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: null,
          error: null,
          isFetching: false,
          isMutating: true,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      expect(result.current.status).toBe("saving");
    });
  });

  describe("Reset Operation", () => {
    it("should reset form to server data when available", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      // Load server data
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: mockServerData,
          error: null,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.serverData).toEqual(mockServerData);
      });

      // Modify form
      act(() => {
        result.current.updateField("terrain", "gravel");
        result.current.updateField("typical_duration_h", "10");
      });

      expect(result.current.form.terrain).toBe("gravel");
      expect(result.current.form.typical_duration_h).toBe("10");

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.form).toEqual({
        terrain: "paved",
        road_type: "scenic",
        typical_duration_h: "2.5",
        typical_distance_km: "150",
      });
      expect(result.current.status).toBe("ready");
    });

    it("should reset to empty form when no server data", () => {
      const { result } = renderHook(() => useProfileState());

      // Fill form
      act(() => {
        result.current.updateField("terrain", "gravel");
        result.current.updateField("road_type", "twisty");
        result.current.updateField("typical_duration_h", "5");
        result.current.updateField("typical_distance_km", "200");
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.form).toEqual({
        terrain: "",
        road_type: "",
        typical_duration_h: "",
        typical_distance_km: "",
      });
    });

    it("should clear all errors on reset", () => {
      const { result } = renderHook(() => useProfileState());

      // Trigger validation errors
      act(() => {
        result.current.validate();
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.errors).toEqual({});
    });

    it("should set status to 'ready' after reset", async () => {
      const { result, rerender } = renderHook(() => useProfileState());

      // Set error status
      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: null,
          error: mockErrorResponse,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("ready");
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid field updates", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("terrain", "gravel");
        result.current.updateField("terrain", "mixed");
      });

      expect(result.current.form.terrain).toBe("mixed");
    });

    it("should handle validation during form updates", () => {
      const { result } = renderHook(() => useProfileState());

      // First validation - all fields empty
      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.terrain).toBeDefined();
      expect(result.current.errors.road_type).toBeDefined();

      // Update terrain field - should clear terrain error
      act(() => {
        result.current.updateField("terrain", "paved");
      });

      expect(result.current.errors.terrain).toBeUndefined();
      expect(result.current.errors.road_type).toBeDefined();

      // Validate again - terrain should pass now, road_type should still fail
      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.terrain).toBeUndefined();
      expect(result.current.errors.road_type).toBeDefined();
    });

    it("should handle empty string to valid value transition", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("typical_duration_h", "");
        result.current.updateField("typical_duration_h", "2.5");
      });

      expect(result.current.form.typical_duration_h).toBe("2.5");
    });

    it("should maintain form state across multiple validation calls", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.validate();
        result.current.validate();
        result.current.validate();
      });

      expect(result.current.form.terrain).toBe("paved");
    });

    it("should handle server data with integer values (no decimals)", async () => {
      const integerServerData: UserPreferencesResponse = {
        ...mockServerData,
        typical_duration_h: 3,
        typical_distance_km: 200,
      };

      const { result, rerender } = renderHook(() => useProfileState());

      act(() => {
        vi.mocked(useUserPreferences).mockReturnValue({
          data: integerServerData,
          error: null,
          isFetching: false,
          isMutating: false,
          fetch: mockFetch,
          upsert: mockUpsert,
        });
      });

      rerender();

      await waitFor(() => {
        expect(result.current.form.typical_duration_h).toBe("3");
        expect(result.current.form.typical_distance_km).toBe("200");
      });
    });

    it("should handle very small decimal values", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "0.1");
        result.current.updateField("typical_distance_km", "0.1");
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(true);
    });

    it("should handle boundary values correctly", () => {
      const { result } = renderHook(() => useProfileState());

      act(() => {
        result.current.updateField("terrain", "paved");
        result.current.updateField("road_type", "scenic");
        result.current.updateField("typical_duration_h", "999.9");
        result.current.updateField("typical_distance_km", "999999.9");
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });
  });
});
