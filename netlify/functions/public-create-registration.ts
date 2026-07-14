import type { Handler } from "@netlify/functions";
import type { RegistrationPayload } from "../../shared/types";
import { PUBLIC_ERROR_MESSAGE } from "../../shared/constants";
import { badRequest, ok, serverError } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { parseJsonBody } from "./_shared/validation";

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
