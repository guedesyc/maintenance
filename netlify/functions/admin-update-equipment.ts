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
      if (!nome) return badRequest("Informe o nome do equipamento.");
      const { error } = await supabase.from("equipamentos_catalogo").upsert(
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
      const { error } = await supabase.from("equipamentos_catalogo").update({ ativo: payload.ativo }).eq("id", payload.id);
      if (error) throw error;
    }

    if (payload.action === "delete") {
      const { error } = await supabase.rpc("delete_equipment_if_unused", {
        equipment_uuid: payload.id,
      });
      if (error) throw error;
    }

    return ok({ success: true });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
