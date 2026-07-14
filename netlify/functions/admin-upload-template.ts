import type { Handler } from "@netlify/functions";
import { assertAdmin } from "./_shared/adminAuth";
import { validateTemplateWorkbook } from "./_shared/excel";
import { badRequest, ok, serverError, unauthorized } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { parseJsonBody } from "./_shared/validation";
import { TEMPLATE_BUCKET, TEMPLATE_CONFIG_KEY } from "../../shared/constants";

export const handler: Handler = async (event) => {
  try {
    assertAdmin(event);
  } catch {
    return unauthorized();
  }

  if (event.httpMethod !== "POST") {
    return badRequest("Metodo nao suportado.");
  }

  try {
    const payload = parseJsonBody<{ fileName: string; fileBase64: string }>(event.body);
    const buffer = Buffer.from(payload.fileBase64, "base64");
    const validation = validateTemplateWorkbook(buffer);
    const supabase = getSupabaseAdmin();
    const timestamp = new Date().toISOString();
    const path = `templates/${timestamp}-${payload.fileName.replace(/\s+/g, "-")}`;

    const { error: uploadError } = await supabase.storage.from(TEMPLATE_BUCKET).upload(path, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const metadata = {
      path,
      filename: payload.fileName,
      sheetName: validation.sheetName,
      updatedAt: timestamp,
      source: "uploaded" as const,
    };

    const { error } = await supabase.from("configuracoes").upsert(
      {
        chave: TEMPLATE_CONFIG_KEY,
        valor: metadata,
      },
      { onConflict: "chave" },
    );
    if (error) throw error;

    await supabase.from("historico_importacoes").insert({
      tipo: "MODELO_EXPORTACAO",
      nome_arquivo: payload.fileName,
      total_lidos: 1,
      total_importados: 1,
      total_duplicados: 0,
      total_vazios: 0,
      modo_importacao: "REPLACE",
    });

    return ok(metadata);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
