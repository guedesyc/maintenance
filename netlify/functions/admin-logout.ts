import type { Handler } from "@netlify/functions";
import { clearAdminCookie } from "./_shared/adminAuth.ts";
import { ok } from "./_shared/responses.ts";

export const handler: Handler = async () =>
  ok(
    { success: true },
    {
      "Set-Cookie": clearAdminCookie(),
    },
  );
