const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

// The API belongs to the same Supabase project as the public client. Using the
// canonical project URL prevents a stale API-only variable from sending the
// frontend to a different database.
const apiBaseUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1`
  : configuredApiBaseUrl;

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}
