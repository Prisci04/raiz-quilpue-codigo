import { createClient } from "@supabase/supabase-js";

let supabaseServerClient;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Missing required server configuration");
  }

  return { url, publishableKey };
}

export function getSupabaseServerClient() {
  if (!supabaseServerClient) {
    const { url, publishableKey } = getSupabaseConfig();

    supabaseServerClient = createClient(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseServerClient;
}
