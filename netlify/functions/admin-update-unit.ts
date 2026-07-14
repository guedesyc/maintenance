import type { Handler } from "@netlify/functions";
import { normalizeText } from "../../shared/normalizeText";
import { assertAdmin } from "./_shared/adminAuth";
import { badRequest, ok, serverError, unauthorized } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { parseJsonBody } from "./_shared/validation";

export const handler: Handler = async (event) => {
  try {
    assertAdmin(event);
  } catch {
    return unauthorized();
  }

  if (event.httpMethod !== "POST") {
    return badRequest("Metodo nao suportado.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const payload = parseJsonBody<{ action: "upsert" | "toggle" | "delete"; id?: string; nome?: string; ativo?: boolean }>(event.body);

    if (payload.action === "upsert") {
      const nome = (payload.nome ?? "").trim();
      if (!nome) return badRequest("Informe o nome da unidade.");
      const { error } = await supabase.from("unidades").upsert(
        {
          id: payload.id || undefined,
          nome,
          nome_normalizado: normalizeText(nome),
          ativo: true,
        },
        { onConflict: "nome_normalizado" },
      );
      if (error) throw error;
    }

    if (payload.action === "toggle") {
      const { error } = await supabase.from("unidades").update({ ativo: payload.ativo }).eq("id", payload.id);
      if (error) throw error;
    }

    if (payload.action === "delete") {
      const { count, error: usageError } = await supabase
        .from("cadastros")
        .select("id", { count: "exact", head: true })
        .eq("unidade_id", payload.id);
      if (usageError) throw usageError;
      if ((count ?? 0) > 0) return badRequest("Nao e permitido excluir unidades ja utilizadas.");
      const { error } = await supabase.from("unidades").delete().eq("id", payload.id);
      if (error) throw error;
    }

    return ok({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
