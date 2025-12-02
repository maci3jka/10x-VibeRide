import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";

import type { Database } from "../db/database.types.ts";

// Use process.env for server-side environment variables
// import.meta.env only works for PUBLIC_ prefixed variables in Astro
const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables (SUPABASE_URL, SUPABASE_KEY)");
}

/**
 * Client-side Supabase client with PKCE OAuth flow
 * Used in React components for authentication
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  db: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: "viberide" as any, // Type assertion needed for custom schema
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce", // PKCE flow for OAuth security
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "viberide-auth",
  },
});

/**
 * Parse cookie header into array of name-value pairs
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create server-side Supabase instance with cookie management
 * Used in Astro pages and API routes for SSR
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAll(cookiesToSet: any) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cookiesToSet.forEach(({ name, value, options }: any) => context.cookies.set(name, value, options));
      },
    },
    db: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: "viberide" as any, // Type assertion needed for custom schema
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any); // Type assertion needed for @supabase/ssr compatibility

  return supabase;
};

// Default user ID for development mode (valid UUID format)
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

// Export properly typed SupabaseClient for use in services
export type SupabaseClient = SupabaseClientBase<Database>;
