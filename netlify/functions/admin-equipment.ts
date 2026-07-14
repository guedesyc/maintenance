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
    let query = supabase.from("equipamentos_catalogo").select("id, nome, nome_normalizado, ativo, created_at, updated_at").order("nome");
    if (search) {
      query = query.ilike("nome", `%${search}%`);
    }
    const [{ data: equipment, error: equipmentError }, { data: assets, error: assetsError }] = await Promise.all([
      query,
      supabase.from("patrimonios").select("equipamento_id"),
    ]);

    if (equipmentError) throw equipmentError;
    if (assetsError) throw assetsError;

    const usageByEquipment = new Map<string, number>();
    for (const asset of assets ?? []) {
      usageByEquipment.set(asset.equipamento_id, (usageByEquipment.get(asset.equipamento_id) ?? 0) + 1);
    }

    return ok({
      rows: (equipment ?? []).map((item) => ({
        ...item,
        usage_count: usageByEquipment.get(item.id) ?? 0,
      })),
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
