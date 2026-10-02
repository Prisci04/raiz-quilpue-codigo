import "server-only";

import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient;

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing required server configuration");
  }

  return { url, secretKey };
}

export function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    const { url, secretKey } = getSupabaseAdminConfig();

    supabaseAdminClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseAdminClient;
}
