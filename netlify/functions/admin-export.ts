import type { Handler } from "@netlify/functions";
import { TEMPLATE_BUCKET, TEMPLATE_CONFIG_KEY } from "../../shared/constants";
import { assertAdmin } from "./_shared/adminAuth";
import { fillExportWorkbook } from "./_shared/excel";
import { badRequest, serverError, unauthorized } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";

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

    let query = supabase.from("vw_admin_registros").select("*").order("cadastro_created_at", { ascending: false });
    if (status) {
      query = query.eq("status", status);
    }
    if (search) {
      query = query.or(`unidade_nome.ilike.%${search}%,equipamento_nome.ilike.%${search}%,numero_patrimonio_text.ilike.%${search}%`);
    }

    const [{ data: rows, error: rowsError }, { data: config, error: configError }] = await Promise.all([
      query,
      supabase.from("configuracoes").select("valor").eq("chave", TEMPLATE_CONFIG_KEY).maybeSingle(),
    ]);

    if (rowsError) throw rowsError;
    if (configError) throw configError;

    const metadata = (config?.valor ?? null) as { path?: string; filename?: string; sheetName?: string } | null;
    let templateBuffer: Buffer | null = null;
    if (metadata?.path) {
      const { data: file, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(metadata.path);
      if (error) throw error;
      templateBuffer = Buffer.from(await file.arrayBuffer());
    }

    const buffer = fillExportWorkbook(templateBuffer, rows ?? [], metadata as never);
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
