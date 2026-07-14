import type { Handler } from "@netlify/functions";
import { assertAdmin } from "./_shared/adminAuth";
import { parseCatalogWorkbook } from "./_shared/excel";
import { badRequest, ok, serverError, unauthorized } from "./_shared/responses";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { parseJsonBody } from "./_shared/validation";

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
    const payload = parseJsonBody<{ fileName: string; fileBase64: string; mode: "ADD" | "REPLACE" }>(event.body);
    const parsed = parseCatalogWorkbook(Buffer.from(payload.fileBase64, "base64"));
    const supabase = getSupabaseAdmin();

    const rows = parsed.rows.map((row) => ({
      nome: row.original,
      nome_normalizado: row.normalized,
      ativo: true,
    }));

    if (payload.mode === "REPLACE") {
      const { data: currentRows, error: currentRowsError } = await supabase
        .from("equipamentos_catalogo")
        .select("id, nome_normalizado");
      if (currentRowsError) throw currentRowsError;
      const incoming = new Set(rows.map((row) => row.nome_normalizado));
      const toDeactivate = (currentRows ?? []).filter((row) => !incoming.has(row.nome_normalizado)).map((row) => row.id);
      if (toDeactivate.length > 0) {
        const { error: deactivateError } = await supabase.from("equipamentos_catalogo").update({ ativo: false }).in("id", toDeactivate);
        if (deactivateError) throw deactivateError;
      }
    }

    const { data: existing, error: existingError } = await supabase
      .from("equipamentos_catalogo")
      .select("id, nome_normalizado")
      .in(
        "nome_normalizado",
        rows.map((row) => row.nome_normalizado),
      );
    if (existingError) throw existingError;

    const existingMap = new Map((existing ?? []).map((item) => [item.nome_normalizado, item.id]));
    const upserts = rows.map((row) => ({
      id: existingMap.get(row.nome_normalizado),
      ...row,
    }));

    const { error } = await supabase.from("equipamentos_catalogo").upsert(upserts, { onConflict: "nome_normalizado" });
    if (error) throw error;

    await supabase.from("historico_importacoes").insert({
      tipo: "EQUIPAMENTOS",
      nome_arquivo: payload.fileName,
      total_lidos: rows.length + parsed.skippedDuplicates + parsed.skippedEmpty,
      total_importados: rows.length,
      total_duplicados: parsed.skippedDuplicates,
      total_vazios: parsed.skippedEmpty,
      modo_importacao: payload.mode,
    });

    return ok({
      totalRead: rows.length + parsed.skippedDuplicates + parsed.skippedEmpty,
      imported: rows.length,
      duplicates: parsed.skippedDuplicates,
      empty: parsed.skippedEmpty,
      mode: payload.mode,
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
};
