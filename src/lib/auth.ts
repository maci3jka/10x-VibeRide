import { supabaseClient } from "../db/supabase.client";

/**
 * Initiate Google OAuth sign-in flow
 * @param redirectTo - Optional callback URL with returnTo parameter
 */
export async function signInWithGoogle(redirectTo?: string) {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("OAuth initiation error:", error);
    throw error;
  }

  return data;
}

/**
 * Setup auth state change listener
 * Handles sign-out and token refresh events
 */
export function setupAuthListener() {
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      window.location.href = "/";
    } else if (event === "TOKEN_REFRESHED") {
      console.log("Session refreshed successfully");
    } else if (event === "USER_UPDATED") {
      console.log("User data updated");
    }
  });
}

/**
 * Manually refresh the current session
 * Returns null if refresh fails
 */
export async function refreshSession() {
  const { data, error } = await supabaseClient.auth.refreshSession();

  if (error) {
    console.error("Session refresh failed:", error);
    return null;
  }

  return data.session;
}
