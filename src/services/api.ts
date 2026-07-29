function withoutSupabasePath(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(?:rest|functions)\/v1$/i, "");
}

const supabaseUrl = withoutSupabasePath(import.meta.env.VITE_SUPABASE_URL ?? "");
const configuredApiBaseUrl = withoutSupabasePath(import.meta.env.VITE_API_BASE_URL ?? "");

// The API belongs to the same Supabase project as the public client. Using the
// canonical project URL prevents a stale API-only variable from sending the
// frontend to a different database.
const apiBaseUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1`
  : configuredApiBaseUrl
    ? `${configuredApiBaseUrl}/functions/v1`
    : "";

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}
