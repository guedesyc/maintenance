import * as XLSX from "xlsx";
import { DEFAULT_TEMPLATE_SHEET } from "../../../shared/constants";
import { generateEquipmentCode } from "../../../shared/generateEquipmentCode";
import { normalizeText } from "../../../shared/normalizeText";
import type { ExportTemplateMetadata, ImportParseResult, RegistrationListRow } from "../../../shared/types";

export function parseCatalogWorkbook(buffer: Buffer): ImportParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("O arquivo nao possui abas.");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 }) as Array<
    Array<string | number | null>
  >;

  const seen = new Set<string>();
  let skippedDuplicates = 0;
  let skippedEmpty = 0;
  const parsedRows = rows
    .slice(1)
    .map((row) => String(row[0] ?? "").trim())
    .filter((raw) => {
      if (!raw) {
        skippedEmpty += 1;
        return false;
      }
      const normalized = normalizeText(raw);
      if (seen.has(normalized)) {
        skippedDuplicates += 1;
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .map((original) => ({ original, normalized: normalizeText(original) }));

  return {
    rows: parsedRows,
    skippedDuplicates,
    skippedEmpty,
    sheetName,
  };
}

export function validateTemplateWorkbook(buffer: Buffer): { sheetName: string; headers: string[] } {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("A planilha modelo nao possui abas.");
  }
  const sheet = workbook.Sheets[sheetName];
  const headerRow = (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] ?? []) as string[];
  const required = ["Nome", "Identificador", "Cliente", "Categoria", "Status"];
  const indexes = [0, 2, 4, 5, 7];

  required.forEach((expected, index) => {
    const actual = String(headerRow[indexes[index]] ?? "").trim();
    if (!actual) {
      throw new Error(`A coluna obrigatoria ${String.fromCharCode(65 + indexes[index])} nao foi encontrada.`);
    }
    if (normalizeText(actual) !== normalizeText(expected)) {
      throw new Error(`Cabecalho inesperado na coluna ${String.fromCharCode(65 + indexes[index])}.`);
    }
  });

  return { sheetName, headers: headerRow.map((item) => String(item ?? "")) };
}

export function buildDefaultTemplateWorkbook() {
  const workbook = XLSX.utils.book_new();
  const data = [
    [
      "Nome",
      "Descricao",
      "Identificador",
      "Colaborador",
      "Cliente",
      "Categoria",
      "Equipamento associado",
      "Status",
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 28 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, sheet, DEFAULT_TEMPLATE_SHEET);
  return workbook;
}

export function fillExportWorkbook(
  templateBuffer: Buffer | null,
  rows: RegistrationListRow[],
  metadata?: ExportTemplateMetadata | null,
) {
  const workbook = templateBuffer ? XLSX.read(templateBuffer, { type: "buffer", cellStyles: true }) : buildDefaultTemplateWorkbook();
  const sheetName = metadata?.sheetName ?? workbook.SheetNames[0] ?? DEFAULT_TEMPLATE_SHEET;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Nao foi possivel localizar a aba da planilha modelo.");
  }

  rows.forEach((row, index) => {
    const currentRow = index + 2;
    sheet[`A${currentRow}`] = { t: "s", v: row.equipamento_nome };
    sheet[`C${currentRow}`] = { t: "n", v: row.numero_patrimonio };
    sheet[`E${currentRow}`] = { t: "s", v: row.unidade_nome };
    sheet[`F${currentRow}`] = { t: "s", v: row.sigla_equipamento || generateEquipmentCode(row.equipamento_nome) };
    sheet[`H${currentRow}`] = { t: "s", v: row.status };
  });

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:H2");
  range.e.r = Math.max(range.e.r, rows.length + 1);
  range.e.c = Math.max(range.e.c, 7);
  sheet["!ref"] = XLSX.utils.encode_range(range);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
