import type { Handler } from "@netlify/functions";
import { clearAdminCookie } from "./_shared/adminAuth";
import { ok } from "./_shared/responses";

export const handler: Handler = async () =>
  ok(
    { success: true },
    {
      "Set-Cookie": clearAdminCookie(),
    },
  );
