import type { APIRoute } from "astro";

/**
 * Sign Out Endpoint
 * 
 * POST /api/auth/signout
 * Clears user session and signs out from Supabase
 * 
 * Auth: Required (must have active session)
 * 
 * Response (Success): 200 OK
 * Response (Error): 401 Unauthorized, 500 Internal Server Error
 */
export const POST: APIRoute = async ({ locals, cookies }) => {
  const supabase = locals.supabase;
  const user = locals.user;

  if (!user) {
    return new Response(
      JSON.stringify({
        error: "unauthorized",
        message: "No active session to sign out.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out failed:", error, { userId: user.id });
      return new Response(
        JSON.stringify({
          error: "signout_failed",
          message: "Failed to sign out. Please try again.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Clear session cookies
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });

    console.log("User signed out successfully", { userId: user.id });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Signed out successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected sign out error:", err, { userId: user.id });
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "An unexpected error occurred.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

// Disable prerendering for this API route
export const prerender = false;

