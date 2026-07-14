import { useState } from "react";
import { exportRegistrations } from "@/services/adminApiService";
import { downloadBlob } from "@/utils/browser";

export default function AdminExport() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const response = await exportRegistrations(params);
      downloadBlob(response.blob, response.filename);
      setMessage("Arquivo exportado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao exportar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel p-6">
      <h1 className="text-3xl font-semibold text-ink">Exportar registros</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Gere um novo Excel no padrao da planilha "Equipamentos Importacao" usando o modelo salvo no painel.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <input
          className="input-base"
          placeholder="Filtrar por unidade, equipamento ou patrimonio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="input-base" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos os status</option>
          <option value="ATIVO">ATIVO</option>
          <option value="INATIVO">INATIVO</option>
        </select>
        <button type="button" className="button-primary" disabled={loading} onClick={onExport}>
          {loading ? "Gerando arquivo..." : "Exportar Excel"}
        </button>
      </div>

      {message && <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{message}</div>}
    </section>
  );
}
