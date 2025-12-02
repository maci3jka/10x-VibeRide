import { useState, useCallback, useEffect } from "react";
import { updateUserPreferencesSchema } from "@/lib/validators/userPreferences";
import type { UserPreferencesResponse, UpdateUserPreferencesRequest } from "@/types";
import { useUserPreferences } from "./useUserPreferences";

/**
 * Client-only form values (strings for controlled inputs)
 */
export interface PreferencesFormValues {
  terrain: "paved" | "gravel" | "mixed" | "";
  road_type: "scenic" | "twisty" | "highway" | "";
  typical_duration_h: string;
  typical_distance_km: string;
}

/**
 * View model for Profile screen
 */
export interface ProfileViewModel {
  form: PreferencesFormValues;
  errors: Partial<Record<keyof PreferencesFormValues, string>>;
  serverData?: UserPreferencesResponse;
  status: "loading" | "ready" | "saving" | "success" | "error";
}

const initialFormValues: PreferencesFormValues = {
  terrain: "",
  road_type: "",
  typical_duration_h: "",
  typical_distance_km: "",
};

/**
 * Hook for managing profile form state and validation
 * Integrates with useUserPreferences for API operations
 */
export function useProfileState() {
  const { data, error, isFetching, isMutating, fetch, upsert } = useUserPreferences();
  const [form, setForm] = useState<PreferencesFormValues>(initialFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof PreferencesFormValues, string>>>({});
  const [serverData, setServerData] = useState<UserPreferencesResponse | undefined>(undefined);
  const [status, setStatus] = useState<ProfileViewModel["status"]>("loading");

  // Load preferences on mount
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Update form when data is fetched
  useEffect(() => {
    if (data) {
      setForm({
        terrain: data.terrain,
        road_type: data.road_type,
        typical_duration_h: String(data.typical_duration_h),
        typical_distance_km: String(data.typical_distance_km),
      });
      setServerData(data);
      setStatus("ready");
    } else if (!isFetching && !data) {
      // First-time user (404)
      setStatus("ready");
    }
  }, [data, isFetching]);

  // Handle API errors
  useEffect(() => {
    if (error) {
      setStatus("error");
    }
  }, [error]);

  // Update status based on loading states
  useEffect(() => {
    if (isFetching) {
      setStatus("loading");
    } else if (isMutating) {
      setStatus("saving");
    }
  }, [isFetching, isMutating]);

  /**
   * Update a single form field
   */
  const updateField = useCallback((field: keyof PreferencesFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Validate form and return true if valid
   */
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof PreferencesFormValues, string>> = {};

    // Check required fields
    if (!form.terrain) {
      newErrors.terrain = "Terrain is required";
    }
    if (!form.road_type) {
      newErrors.road_type = "Road type is required";
    }
    if (!form.typical_duration_h) {
      newErrors.typical_duration_h = "Typical duration is required";
    }
    if (!form.typical_distance_km) {
      newErrors.typical_distance_km = "Typical distance is required";
    }

    // If any required fields are missing, set errors and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    // Parse numbers
    const duration = parseFloat(form.typical_duration_h);
    const distance = parseFloat(form.typical_distance_km);

    // Validate with Zod schema
    const result = updateUserPreferencesSchema.safeParse({
      terrain: form.terrain,
      road_type: form.road_type,
      typical_duration_h: duration,
      typical_distance_km: distance,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (Array.isArray(messages) && messages.length > 0) {
          newErrors[field as keyof PreferencesFormValues] = messages[0];
        }
      }
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [form]);

  /**
   * Check if form is dirty (changed from server data)
   */
  const isDirty = useCallback((): boolean => {
    if (!serverData) {
      // If no server data, form is dirty if any field is filled
      return (
        form.terrain !== "" ||
        form.road_type !== "" ||
        form.typical_duration_h !== "" ||
        form.typical_distance_km !== ""
      );
    }

    return (
      form.terrain !== serverData.terrain ||
      form.road_type !== serverData.road_type ||
      form.typical_duration_h !== String(serverData.typical_duration_h) ||
      form.typical_distance_km !== String(serverData.typical_distance_km)
    );
  }, [form, serverData]);

  /**
   * Save preferences
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!validate()) {
      return false;
    }

    const payload: UpdateUserPreferencesRequest = {
      terrain: form.terrain as "paved" | "gravel" | "mixed",
      road_type: form.road_type as "scenic" | "twisty" | "highway",
      typical_duration_h: parseFloat(form.typical_duration_h),
      typical_distance_km: parseFloat(form.typical_distance_km),
    };

    const result = await upsert(payload);

    if (result) {
      setServerData(result);
      setStatus("success");
      return true;
    }

    setStatus("error");
    return false;
  }, [form, validate, upsert]);

  /**
   * Reset form to server data
   */
  const reset = useCallback(() => {
    if (serverData) {
      setForm({
        terrain: serverData.terrain,
        road_type: serverData.road_type,
        typical_duration_h: String(serverData.typical_duration_h),
        typical_distance_km: String(serverData.typical_distance_km),
      });
    } else {
      setForm(initialFormValues);
    }
    setErrors({});
    setStatus("ready");
  }, [serverData]);

  return {
    form,
    errors,
    serverData,
    status,
    apiError: error,
    updateField,
    validate,
    isDirty: isDirty(),
    save,
    reset,
  };
}
