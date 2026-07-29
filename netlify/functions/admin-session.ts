import type { Handler } from "@netlify/functions";
import { readAdminSession } from "./_shared/adminAuth.ts";
import { ok } from "./_shared/responses.ts";

export const handler: Handler = async (event) => {
  const session = readAdminSession(event);
  return ok(
    session
      ? {
          authenticated: true,
          username: session.username,
        }
      : {
          authenticated: false,
        },
  );
};
