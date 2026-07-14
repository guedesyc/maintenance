import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./validation";

function normalizeSupabaseUrl(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function getSupabaseAdmin() {
  return createClient(normalizeSupabaseUrl(requireEnv("SUPABASE_URL")), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
