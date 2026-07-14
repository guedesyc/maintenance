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
    let query = supabase.from("unidades").select("id, nome, nome_normalizado, ativo, created_at, updated_at").order("nome");
    if (search) {
      query = query.ilike("nome", `%${search}%`);
    }
    const [{ data: units, error: unitsError }, { data: registrations, error: registrationsError }] = await Promise.all([
      query,
      supabase.from("cadastros").select("unidade_id"),
    ]);

    if (unitsError) throw unitsError;
    if (registrationsError) throw registrationsError;

    const usageByUnit = new Map<string, number>();
    for (const registration of registrations ?? []) {
      usageByUnit.set(registration.unidade_id, (usageByUnit.get(registration.unidade_id) ?? 0) + 1);
    }

    return ok({
      rows: (units ?? []).map((unit) => ({
        ...unit,
        usage_count: usageByUnit.get(unit.id) ?? 0,
      })),
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
