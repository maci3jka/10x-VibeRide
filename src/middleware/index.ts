import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance, DEFAULT_USER_ID } from "../db/supabase.client.ts";

/**
 * Middleware to populate Supabase client and user in context.locals
 *
 * In development mode (DEVENV='true'), authentication is bypassed and a default user is used.
 * In production mode, user is extracted from the Supabase session with automatic refresh.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Check if we're in development mode
  // Use process.env for server-side environment variables
  const isDev = process.env.DEVENV === "true";

  if (isDev) {
    // Development mode: bypass authentication with default user
    // Create a dummy supabase instance for type compatibility
    const supabase = createSupabaseServerInstance({
      headers: context.request.headers,
      cookies: context.cookies,
    });

    context.locals.supabase = supabase;
    context.locals.user = {
      id: DEFAULT_USER_ID,
      email: "dev@viberide.local",
    };
  } else {
    // Production mode: create server-side Supabase instance with cookie management
    const supabase = createSupabaseServerInstance({
      headers: context.request.headers,
      cookies: context.cookies,
    });

    context.locals.supabase = supabase;

    try {
      // Get session (will auto-refresh if expired)
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        // eslint-disable-next-line no-console
        console.error("Session validation error:", error);
        context.locals.user = null;
      } else if (session?.user) {
        context.locals.user = {
          id: session.user.id,
          email: session.user.email ?? null,
        };
      } else {
        context.locals.user = null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Middleware error:", err);
      context.locals.user = null;
    }
  }

  return next();
});
