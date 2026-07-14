import type { Handler } from "@netlify/functions";
import { readAdminSession } from "./_shared/adminAuth";
import { ok } from "./_shared/responses";

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
