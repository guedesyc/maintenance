import { useState } from "react";
import * as XLSX from "xlsx";
import { fileToBase64 } from "@/utils/browser";
import { downloadTemplate, importEquipment, importUnits, uploadTemplate } from "@/services/adminApiService";
import LoadingSpinner from "@/components/LoadingSpinner";

interface PreviewState {
  name: string;
  rows: string[];
  ready: boolean;
}

function readColumnPreview(file: File): Promise<PreviewState> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("O arquivo nao possui abas.");
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error("Nao foi possivel abrir a primeira aba do arquivo.");
    }
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as Array<Array<string | number>>;
    const preview = rows.slice(1, 6).map((row) => String(row[0] ?? "").trim()).filter(Boolean);
    return {
      name: sheetName,
      rows: preview,
      ready: true,
    };
  });
}

function readTemplatePreview(file: File): Promise<PreviewState> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("A planilha modelo nao possui abas.");
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error("Nao foi possivel abrir a primeira aba da planilha modelo.");
    }
    const headers = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 })[0] ?? [];
    return {
      name: sheetName,
      rows: headers.map((item) => String(item ?? "")),
      ready: true,
    };
  });
}

export default function AdminImports() {
  const [unitFile, setUnitFile] = useState<File | null>(null);
  const [equipmentFile, setEquipmentFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [unitMode, setUnitMode] = useState<"ADD" | "REPLACE">("ADD");
  const [equipmentMode, setEquipmentMode] = useState<"ADD" | "REPLACE">("ADD");
  const [unitPreview, setUnitPreview] = useState<PreviewState | null>(null);
  const [equipmentPreview, setEquipmentPreview] = useState<PreviewState | null>(null);
  const [templatePreview, setTemplatePreview] = useState<PreviewState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onImport = async (kind: "units" | "equipment" | "template") => {
    setLoading(true);
    setMessage(null);
    try {
      if (kind === "units" && unitFile) {
        const fileBase64 = await fileToBase64(unitFile);
        const summary = await importUnits({ fileName: unitFile.name, fileBase64, mode: unitMode });
        setMessage(`Unidades importadas: ${summary.imported}. Duplicadas ignoradas: ${summary.duplicates}. Vazias: ${summary.empty}.`);
      }
      if (kind === "equipment" && equipmentFile) {
        const fileBase64 = await fileToBase64(equipmentFile);
        const summary = await importEquipment({ fileName: equipmentFile.name, fileBase64, mode: equipmentMode });
        setMessage(`Equipamentos importados: ${summary.imported}. Duplicados ignorados: ${summary.duplicates}. Vazios: ${summary.empty}.`);
      }
      if (kind === "template" && templateFile) {
        const fileBase64 = await fileToBase64(templateFile);
        const metadata = await uploadTemplate({ fileName: templateFile.name, fileBase64 });
        setMessage(`Modelo atualizado com sucesso. Aba principal: ${metadata.sheetName}.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao importar arquivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="panel p-6">
        <h1 className="text-3xl font-semibold text-ink">Importacoes e planilha modelo</h1>
        <p className="mt-2 text-sm text-stone-600">
          Importe unidades, equipamentos e a planilha modelo de exportacao com validacao previa.
        </p>
      </header>

      {message && <div className="panel p-4 text-sm text-stone-700">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="panel p-6">
          <h2 className="text-xl font-semibold text-ink">Nome das Unidades</h2>
          <p className="mt-2 text-sm text-stone-600">Leitura da coluna A a partir da linha 2.</p>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="mt-4 block w-full text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0] ?? null;
              setUnitFile(file);
              setUnitPreview(file ? await readColumnPreview(file) : null);
            }}
          />
          <select className="input-base mt-4" value={unitMode} onChange={(e) => setUnitMode(e.target.value as "ADD" | "REPLACE")}>
            <option value="ADD">Adicionar novos registros</option>
            <option value="REPLACE">Substituir catalogo atual</option>
          </select>
          {unitPreview?.ready && (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
              <p className="font-medium text-ink">Aba: {unitPreview.name}</p>
              <p className="mt-2 text-stone-600">Previa:</p>
              <ul className="mt-2 space-y-1 text-stone-700">
                {unitPreview.rows.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="button-primary mt-5 w-full" disabled={!unitFile || loading} onClick={() => onImport("units")}>
            Confirmar importacao
          </button>
        </article>

        <article className="panel p-6">
          <h2 className="text-xl font-semibold text-ink">Planilha de Equipamentos</h2>
          <p className="mt-2 text-sm text-stone-600">Leitura da coluna A a partir da linha 2.</p>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="mt-4 block w-full text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0] ?? null;
              setEquipmentFile(file);
              setEquipmentPreview(file ? await readColumnPreview(file) : null);
            }}
          />
          <select className="input-base mt-4" value={equipmentMode} onChange={(e) => setEquipmentMode(e.target.value as "ADD" | "REPLACE")}>
            <option value="ADD">Adicionar novos registros</option>
            <option value="REPLACE">Substituir catalogo atual</option>
          </select>
          {equipmentPreview?.ready && (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
              <p className="font-medium text-ink">Aba: {equipmentPreview.name}</p>
              <p className="mt-2 text-stone-600">Previa:</p>
              <ul className="mt-2 space-y-1 text-stone-700">
                {equipmentPreview.rows.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            className="button-primary mt-5 w-full"
            disabled={!equipmentFile || loading}
            onClick={() => onImport("equipment")}
          >
            Confirmar importacao
          </button>
        </article>

        <article className="panel p-6">
          <h2 className="text-xl font-semibold text-ink">Planilha Modelo de Exportacao</h2>
          <p className="mt-2 text-sm text-stone-600">Valida as colunas A, C, E, F e H antes de salvar no bucket privado.</p>
          <input
            type="file"
            accept=".xlsx"
            className="mt-4 block w-full text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0] ?? null;
              setTemplateFile(file);
              setTemplatePreview(file ? await readTemplatePreview(file) : null);
            }}
          />
          {templatePreview?.ready && (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
              <p className="font-medium text-ink">Aba: {templatePreview.name}</p>
              <p className="mt-2 text-stone-600">Cabecalhos:</p>
              <ul className="mt-2 space-y-1 text-stone-700">
                {templatePreview.rows.map((row) => (
                  <li key={row}>{row || "-"}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-5 flex gap-3">
            <button type="button" className="button-primary flex-1" disabled={!templateFile || loading} onClick={() => onImport("template")}>
              Salvar modelo
            </button>
            <button
              type="button"
              className="button-secondary flex-1"
              disabled={loading}
              onClick={async () => {
                const download = await downloadTemplate();
                const link = document.createElement("a");
                link.href = URL.createObjectURL(download.blob);
                link.download = download.filename;
                link.click();
                URL.revokeObjectURL(link.href);
              }}
            >
              Baixar atual
            </button>
          </div>
        </article>
      </div>

      {loading && (
        <div className="panel p-4">
          <LoadingSpinner label="Processando importacao..." />
        </div>
      )}
    </section>
  );
}
