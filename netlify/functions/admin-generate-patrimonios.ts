import type { Handler } from "@netlify/functions";
import { assertAdmin } from "./_shared/adminAuth.ts";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin.ts";
import { badRequest, ok, serverError, unauthorized } from "./_shared/responses.ts";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return badRequest("Metodo nao suportado.");
  }

  try {
    assertAdmin(event);
  } catch {
    return unauthorized();
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("generate_pending_patrimonios");

    if (error) {
      console.error("Erro na RPC generate_pending_patrimonios", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return badRequest(error.message);
    }

    return ok(data);
  } catch (error) {
    console.error("Erro ao gerar patrimonios pendentes", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return serverError(error instanceof Error ? error.message : JSON.stringify(error));
  }
};
