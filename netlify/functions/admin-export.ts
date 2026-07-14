import type { Handler } from "@netlify/functions";
import { TEMPLATE_BUCKET, TEMPLATE_CONFIG_KEY } from "../../shared/constants";
import { assertAdmin } from "./_shared/adminAuth";
import { fillExportWorkbook } from "./_shared/excel";
import { badRequest, serverError, unauthorized } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { listAdminRegistrations } from "./_shared/registrations";

export const handler: Handler = async (event) => {
  try {
    assertAdmin(event);
  } catch {
    return unauthorized();
  }

  if (event.httpMethod !== "GET") {
    return badRequest("Metodo nao suportado.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const params = event.queryStringParameters ?? {};
    const search = (params.search ?? "").trim();
    const status = (params.status ?? "").trim();

    const [{ rows }, { data: config, error: configError }] = await Promise.all([
      listAdminRegistrations(supabase, { search, status }),
      supabase.from("configuracoes").select("valor").eq("chave", TEMPLATE_CONFIG_KEY).maybeSingle(),
    ]);

    if (configError) throw configError;

    const metadata = (config?.valor ?? null) as { path?: string; filename?: string; sheetName?: string } | null;
    let templateBuffer: Buffer | null = null;
    if (metadata?.path) {
      const { data: file, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(metadata.path);
      if (error) throw error;
      templateBuffer = Buffer.from(await file.arrayBuffer());
    }

    const buffer = fillExportWorkbook(templateBuffer, rows, metadata as never);
    const stamp = new Date()
      .toISOString()
      .replace(/[:T]/g, "-")
      .replace(/\..+$/, "")
      .slice(0, 16);
    const filename = `equipamentos-importacao-${stamp}.xlsx`;

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "x-export-filename": filename,
      },
      body: buffer.toString("base64"),
    };
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
