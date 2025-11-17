import type { SupabaseClient } from "../../db/supabase.client";
import type { UserPreferencesResponse } from "../../types";
import type { UpdateUserPreferencesInput } from "../validators/userPreferences";

/**
 * Service for managing user preferences
 */

/**
 * Upserts user preferences (creates if not exists, updates if exists)
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @param prefs User preferences data
 * @returns User preferences with timestamps
 * @throws Error if database operation fails
 */
export async function upsertUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: UpdateUserPreferencesInput
): Promise<UserPreferencesResponse> {
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        terrain: prefs.terrain,
        road_type: prefs.road_type,
        typical_duration_h: prefs.typical_duration_h,
        typical_distance_km: prefs.typical_distance_km,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    )
    .select("*")
    .single();

  if (error) {
    console.error("Supabase upsert error details:", JSON.stringify(error, null, 2));
    throw new Error(`Failed to upsert user preferences: ${error.message} (code: ${error.code})`);
  }

  if (!data) {
    throw new Error("No data returned from upsert operation");
  }

  return data as UserPreferencesResponse;
}

/**
 * Retrieves user preferences
 * @param supabase Supabase client instance
 * @param userId User ID from authenticated session
 * @returns User preferences or null if not found
 * @throws Error if database operation fails
 */
export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferencesResponse | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // Return null if record doesn't exist (not an error case)
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch user preferences: ${error.message}`);
  }

  return data as UserPreferencesResponse;
}

