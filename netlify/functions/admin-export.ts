import type { Handler, HandlerResponse } from "@netlify/functions";
import { TEMPLATE_BUCKET, TEMPLATE_CONFIG_KEY } from "../../shared/constants.ts";
import { assertAdmin } from "./_shared/adminAuth.ts";
import { fillExportWorkbook } from "./_shared/excel.ts";
import { badRequest, serverError, unauthorized } from "./_shared/responses.ts";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin.ts";
import { listAdminRegistrations } from "./_shared/registrations.ts";

type ExportFileResult =
  | ReturnType<typeof unauthorized>
  | ReturnType<typeof badRequest>
  | ReturnType<typeof serverError>
  | {
      statusCode: 200;
      headers: Record<string, string>;
      body: Buffer;
    };

export async function createExportFile(event: Parameters<Handler>[0]): Promise<ExportFileResult> {
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

    const rawMetadata = config?.valor ?? null;
    const metadata = (typeof rawMetadata === "string" ? JSON.parse(rawMetadata) : rawMetadata) as {
      path?: string;
      filename?: string;
      sheetName?: string;
    } | null;
    let templateBuffer: Buffer | null = null;
    if (metadata?.path) {
      const { data: file, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(metadata.path);
      if (error) throw error;
      templateBuffer = Buffer.from(await file.arrayBuffer());
    }

    const buffer = fillExportWorkbook(
      templateBuffer,
      rows,
      metadata as never,
    );
    const stamp = new Date()
      .toISOString()
      .replace(/[:T]/g, "-")
      .replace(/\..+$/, "")
      .slice(0, 16);
    const filename = `equipamentos-importacao-${stamp}.xlsx`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "x-export-filename": filename,
      },
      body: buffer,
    };
  } catch (error) {
    return serverError(error instanceof Error ? error.message : JSON.stringify(error));
  }
}

export const handler: Handler = async (event): Promise<HandlerResponse> => {
  const result = await createExportFile(event);
  if (!Buffer.isBuffer(result.body)) return result as HandlerResponse;
  return {
    ...result,
    isBase64Encoded: true,
    body: result.body.toString("base64"),
  } as HandlerResponse;
};
