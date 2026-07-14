import type { Handler } from "@netlify/functions";
import { assertAdmin } from "./_shared/adminAuth";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { badRequest, ok, serverError, unauthorized } from "./_shared/responses";

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
      return badRequest(error.message);
    }

    return ok(data);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
