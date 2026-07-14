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

    const [cadastros, patrimonios, unidades, equipamentos, importacoes, ultimos] = await Promise.all([
      supabase.from("cadastros").select("id", { count: "exact", head: true }),
      supabase.from("patrimonios").select("id", { count: "exact", head: true }),
      supabase.from("unidades").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("equipamentos_catalogo").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("historico_importacoes").select("id", { count: "exact", head: true }),
      supabase
        .from("vw_admin_registros")
        .select("*")
        .order("cadastro_created_at", { ascending: false })
        .limit(8),
    ]);

    return ok({
      totalCadastros: cadastros.count ?? 0,
      totalPatrimonios: patrimonios.count ?? 0,
      unidadesAtivas: unidades.count ?? 0,
      equipamentosAtivos: equipamentos.count ?? 0,
      totalImportacoes: importacoes.count ?? 0,
      ultimosCadastros: ultimos.data ?? [],
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
