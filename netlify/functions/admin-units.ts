import type { Handler } from "@netlify/functions";
import { assertAdmin } from "./_shared/adminAuth";
import { ok, serverError, unauthorized } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";

export const handler: Handler = async (event) => {
  try {
    assertAdmin(event);
  } catch {
    return unauthorized();
  }

  try {
    const supabase = getSupabaseAdmin();
    const params = event.queryStringParameters ?? {};
    const search = (params.search ?? "").trim();
    let query = supabase.from("vw_admin_unidades").select("*").order("nome");
    if (search) {
      query = query.ilike("nome", `%${search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return ok({ rows: data ?? [] });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
