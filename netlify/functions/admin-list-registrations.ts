import type { Handler } from "@netlify/functions";
import { assertAdmin } from "./_shared/adminAuth";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { ok, serverError, unauthorized } from "./_shared/responses";

export const handler: Handler = async (event) => {
  try {
    assertAdmin(event);
  } catch {
    return unauthorized();
  }

  try {
    const supabase = getSupabaseAdmin();
    const params = event.queryStringParameters ?? {};
    const page = Math.max(Number(params.page ?? "1"), 1);
    const pageSize = Math.max(Number(params.pageSize ?? "12"), 1);
    const search = (params.search ?? "").trim();
    const status = (params.status ?? "").trim();

    let query = supabase
      .from("vw_admin_registros")
      .select("*", { count: "exact" })
      .order("cadastro_created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`unidade_nome.ilike.%${search}%,equipamento_nome.ilike.%${search}%,numero_patrimonio_text.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return ok({
      rows: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
