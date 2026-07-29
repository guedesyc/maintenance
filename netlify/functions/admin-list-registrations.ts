import type { Handler } from "@netlify/functions";
import { assertAdmin } from "./_shared/adminAuth.ts";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin.ts";
import { ok, serverError, unauthorized } from "./_shared/responses.ts";
import { listAdminRegistrations } from "./_shared/registrations.ts";

export const handler: Handler = async (event) => {
  try {
    assertAdmin(event);
  } catch {
    return unauthorized();
  }

  try {
    const supabase = getSupabaseAdmin();
    const params = event.queryStringParameters ?? {};
    const page = Math.max(Number(params.page ?? "1"), 1);
    const pageSize = Math.max(Number(params.pageSize ?? "50"), 1);
    const search = (params.search ?? "").trim();
    const status = (params.status ?? "").trim();
    const responsavel = (params.responsavel ?? "").trim();

    const { rows, total, unitNames } = await listAdminRegistrations(supabase, { page, pageSize, search, status, responsavel });

    return ok({
      rows,
      total,
      unitNames,
      page,
      pageSize,
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : JSON.stringify(error));
  }
};
