import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const DEFAULT_USER_ID = "1234567890";
