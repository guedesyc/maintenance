import type { Handler } from "@netlify/functions";
import { assertAdmin } from "./_shared/adminAuth";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { ok, serverError, unauthorized } from "./_shared/responses";
import { listAdminRegistrations } from "./_shared/registrations";

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
    const pageSize = Math.max(Number(params.pageSize ?? "12"), 1);
    const search = (params.search ?? "").trim();
    const status = (params.status ?? "").trim();

    const { rows, total } = await listAdminRegistrations(supabase, { page, pageSize, search, status });

    return ok({
      rows,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
