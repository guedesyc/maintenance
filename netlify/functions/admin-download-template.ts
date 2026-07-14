import type { Handler } from "@netlify/functions";
import { TEMPLATE_BUCKET, TEMPLATE_CONFIG_KEY } from "@shared/constants";
import { assertAdmin } from "./_shared/adminAuth";
import { buildDefaultTemplateWorkbook } from "./_shared/excel";
import { badRequest, serverError, unauthorized } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import * as XLSX from "xlsx";

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
    const { data } = await supabase.from("configuracoes").select("valor").eq("chave", TEMPLATE_CONFIG_KEY).maybeSingle();
    const metadata = data?.valor as { path: string; filename: string } | undefined;

    let buffer: Buffer;
    let filename = metadata?.filename ?? "modelo-exportacao-padrao.xlsx";

    if (metadata?.path) {
      const { data: file, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(metadata.path);
      if (error) throw error;
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      buffer = XLSX.write(buildDefaultTemplateWorkbook(), { type: "buffer", bookType: "xlsx" }) as Buffer;
    }

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
