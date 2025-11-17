import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: "viberide",
  },
});

// Default user ID for development mode (valid UUID format)
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

// Export properly typed SupabaseClient for use in services
export type SupabaseClient = SupabaseClientBase<Database>;
