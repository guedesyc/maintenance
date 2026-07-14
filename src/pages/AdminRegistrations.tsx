import { useEffect, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import LoadingSpinner from "@/components/LoadingSpinner";
import { generatePendingPatrimonios, getRegistrations } from "@/services/adminApiService";
import type { RegistrationListRow } from "@shared/types";

export default function AdminRegistrations() {
  const [rows, setRows] = useState<RegistrationListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const params = useMemo(() => {
    const current = new URLSearchParams({
      page: String(page),
      pageSize: "12",
    });
    if (search) current.set("search", search);
    if (status) current.set("status", status);
    return current;
  }, [page, search, status]);

  const loadRegistrations = () => {
    setLoading(true);
    getRegistrations(params)
      .then((response) => {
        setRows(response.rows);
        setTotal(response.total);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Falha ao carregar registros.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRegistrations();
  }, [params]);

  const pendingCount = rows.filter((row) => row.patrimonio_pendente).length;

  const generatePatrimonios = async () => {
    setGenerating(true);
    setMessage(null);
    setError(null);
    try {
      const response = await generatePendingPatrimonios();
      setMessage(
        response.generated > 0
          ? `${response.generated} patrimonio(s) gerado(s) com sucesso.`
          : "Nao havia patrimonios pendentes para gerar.",
      );
      loadRegistrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar patrimonios.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Cadastros</h1>
          <p className="mt-2 text-sm text-stone-600">Pesquise, filtre e gere os patrimonios pendentes.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
          <input
            className="input-base"
            placeholder="Pesquisar unidade, equipamento ou patrimonio"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <select
            className="input-base"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os status</option>
            <option value="ATIVO">ATIVO</option>
            <option value="INATIVO">INATIVO</option>
          </select>
          <button
            type="button"
            className="button-primary whitespace-nowrap"
            disabled={generating}
            onClick={generatePatrimonios}
          >
            {generating ? "Gerando..." : `Gerar patrimonios${pendingCount ? ` (${pendingCount})` : ""}`}
          </button>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {message}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Carregando cadastros..." />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="pb-3">Data</th>
                <th className="pb-3">Unidade</th>
                <th className="pb-3">Equipamento</th>
                <th className="pb-3">Patrimonio</th>
                <th className="pb-3">Sigla</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.item_id} className="border-t border-stone-100">
                    <td className="py-3">{new Date(row.cadastro_created_at).toLocaleString("pt-BR")}</td>
                    <td className="py-3">{row.unidade_nome}</td>
                    <td className="py-3">{row.equipamento_nome}</td>
                    <td className="py-3">
                      {row.patrimonio_codigo ?? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3">{row.sigla_equipamento}</td>
                    <td className="py-3">
                      <div>{row.status}</div>
                      {row.equipamento_cliente && <div className="text-xs text-stone-500">Cliente</div>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-stone-500">
                    Nenhum registro encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} pageSize={12} total={total} onPageChange={setPage} />
      </div>
    </section>
  );
}
