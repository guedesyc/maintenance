import type { Handler } from "@netlify/functions";
import { adminLoginSchema } from "../../shared/validations";
import { createAdminCookie } from "./_shared/adminAuth";
import { badRequest, ok, unauthorized } from "./_shared/responses";
import { parseJsonBody, requireEnv } from "./_shared/validation";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return badRequest("Metodo nao suportado.");
  }

  try {
    const payload = adminLoginSchema.parse(parseJsonBody<{ username: string; password: string }>(event.body));
    if (payload.username !== requireEnv("ADMIN_USERNAME") || payload.password !== requireEnv("ADMIN_PASSWORD")) {
      return unauthorized("Usuario ou senha invalidos.");
    }

    return ok(
      { authenticated: true },
      {
        "Set-Cookie": createAdminCookie(payload.username),
      },
    );
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Nao foi possivel autenticar.");
  }
};
