import type { Handler } from "@netlify/functions";
import type { RegistrationPayload } from "../../shared/types.ts";
import { PUBLIC_ERROR_MESSAGE } from "../../shared/constants.ts";
import { badRequest, ok, serverError } from "./_shared/responses.ts";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin.ts";
import { parseJsonBody } from "./_shared/validation.ts";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return badRequest("Metodo nao suportado.");
  }

  try {
    const payload = parseJsonBody<RegistrationPayload>(event.body);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("create_registration", {
      payload,
    });

    if (error) {
      return badRequest(PUBLIC_ERROR_MESSAGE);
    }

    return ok(data);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
