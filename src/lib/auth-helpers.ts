import type { SupabaseClient } from "../db/supabase.client";

/**
 * Verifies if the current request is authenticated with service_role
 *
 * In production, this checks if the Supabase client has service_role privileges.
 * In dev mode (DEVENV='true'), this check is bypassed.
 *
 * @param supabase Supabase client instance
 * @returns true if service_role or dev mode, false otherwise
 */
export async function isServiceRole(supabase: SupabaseClient): Promise<boolean> {
  // In dev mode, bypass service role check
  if (process.env.DEVENV === "true") {
    return true;
  }

  try {
    // Attempt to query auth.users table - only service_role can access this
    // This is a lightweight check that doesn't require JWT parsing
    const { error } = await supabase.schema("auth").from("users").select("id", { count: "exact", head: true }).limit(0);

    // If no error, we have service_role access
    return !error;
  } catch {
    return false;
  }
}

/**
 * Checks if a user is authenticated (has a valid session)
 *
 * @param userId User ID from context.locals.user
 * @returns true if user is authenticated, false otherwise
 */
export function isAuthenticated(userId: string | null | undefined): boolean {
  return !!userId;
}

/**
 * Gets the environment mode
 *
 * @returns true if in development mode, false otherwise
 */
export function isDevelopmentMode(): boolean {
  return process.env.DEVENV === "true";
}
