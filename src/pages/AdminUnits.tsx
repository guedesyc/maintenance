import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { adminFetch } from "@/services/adminApiService";
import type { Unit } from "@shared/types";

type ManagedUnit = Unit & { usage_count?: number };

export default function AdminUnits() {
  const [units, setUnits] = useState<ManagedUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id: string; nome: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () =>
    adminFetch<{ rows: ManagedUnit[] }>(`/api/admin-units?search=${encodeURIComponent(search)}`).then((response) => {
      setUnits(response.rows);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, [search]);

  const saveEdit = async () => {
    if (!editing) return;
    await adminFetch("/api/admin-update-unit", {
      method: "POST",
      body: JSON.stringify({
        action: "upsert",
        id: editing.id,
        nome: editing.nome,
      }),
    });
    setEditing(null);
    await load();
  };

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Unidades</h1>
          <p className="mt-2 text-sm text-stone-600">Adicione, edite, ative e inative as unidades do catalogo.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="input-base" placeholder="Pesquisar unidade" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className="button-primary" onClick={() => setEditing({ id: "", nome: "" })}>
            Nova unidade
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Carregando unidades..." />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="pb-3">Nome</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Uso historico</th>
                <th className="pb-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-t border-stone-100">
                  <td className="py-3">{unit.nome}</td>
                  <td className="py-3">{unit.ativo ? "Ativa" : "Inativa"}</td>
                  <td className="py-3">{unit.usage_count ?? 0}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="button-secondary" onClick={() => setEditing({ id: unit.id, nome: unit.nome })}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={async () => {
                          await adminFetch("/api/admin-update-unit", {
                            method: "POST",
                            body: JSON.stringify({
                              action: "toggle",
                              id: unit.id,
                              ativo: !unit.ativo,
                            }),
                          });
                          await load();
                        }}
                      >
                        {unit.ativo ? "Inativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={(unit.usage_count ?? 0) > 0}
                        onClick={() => setConfirmDelete(unit.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-lg font-semibold text-ink">{editing.id ? "Editar unidade" : "Nova unidade"}</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input className="input-base" value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
            <button type="button" className="button-primary" onClick={saveEdit}>
              Salvar
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Excluir unidade"
        message="Essa acao so sera permitida para unidades nunca utilizadas."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await adminFetch("/api/admin-update-unit", {
            method: "POST",
            body: JSON.stringify({ action: "delete", id: confirmDelete }),
          });
          setConfirmDelete(null);
          await load();
        }}
      />
    </section>
  );
}
