import { useEffect, useState } from "react";
import { getDashboardSummary } from "@/services/adminApiService";
import type { DashboardSummary } from "@shared/types";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary().then(setData).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Falha ao carregar dashboard.");
    });
  }, []);

  if (error) {
    return <div className="panel p-6 text-sm text-red-700">{error}</div>;
  }

  if (!data) {
    return (
      <div className="panel p-6">
        <LoadingSpinner label="Carregando dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <h1 className="text-3xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-2 text-sm text-stone-600">Visao geral dos cadastros, catalogos ativos e importacoes.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Cadastros", value: data.totalCadastros },
          { label: "Patrimonios", value: data.totalPatrimonios },
          { label: "Unidades ativas", value: data.unidadesAtivas },
          { label: "Equipamentos ativos", value: data.equipamentosAtivos },
          { label: "Importacoes", value: data.totalImportacoes },
        ].map((item) => (
          <article key={item.label} className="panel p-5">
            <p className="text-sm text-stone-500">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold text-ink">Ultimos cadastros</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="pb-3">Data</th>
                <th className="pb-3">Unidade</th>
                <th className="pb-3">Equipamento</th>
                <th className="pb-3">Patrimonio</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimosCadastros.length > 0 ? (
                data.ultimosCadastros.map((row) => (
                  <tr key={row.item_id} className="border-t border-stone-100">
                    <td className="py-3">{new Date(row.cadastro_created_at).toLocaleString("pt-BR")}</td>
                    <td className="py-3">{row.unidade_nome}</td>
                    <td className="py-3">{row.equipamento_nome}</td>
                    <td className="py-3">{row.patrimonio_codigo ?? "Pendente"}</td>
                    <td className="py-3">{row.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-stone-500">
                    Nenhum cadastro encontrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
