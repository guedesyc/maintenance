import type { Handler } from "@netlify/functions";
import { badRequest, ok, serverError } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return badRequest("Metodo nao suportado.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("equipamentos_catalogo")
      .select("id, nome, nome_normalizado, ativo")
      .eq("ativo", true)
      .order("nome");

    if (error) throw error;

    return ok({ rows: data ?? [] });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
