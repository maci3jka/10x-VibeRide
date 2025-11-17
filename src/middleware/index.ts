import { defineMiddleware } from "astro:middleware";

import { supabaseClient, DEFAULT_USER_ID } from "../db/supabase.client.ts";

/**
 * Middleware to populate Supabase client and user in context.locals
 *
 * In development mode (DEVENV='true'), authentication is bypassed and a default user is used.
 * In production mode, user is extracted from the Supabase session.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  // Check if we're in development mode
  const isDev = import.meta.env.DEVENV === "true";

  if (isDev) {
    // Development mode: use default user
    context.locals.user = {
      id: DEFAULT_USER_ID,
      email: "dev@viberide.local",
    };
  } else {
    // Production mode: get user from session
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (session?.user) {
      context.locals.user = {
        id: session.user.id,
        email: session.user.email,
      };
    } else {
      context.locals.user = null;
    }
  }

  return next();
});
