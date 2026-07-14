import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { adminFetch } from "@/services/adminApiService";
import type { EquipmentCatalogItem } from "@shared/types";

type ManagedEquipment = EquipmentCatalogItem & { usage_count?: number };

export default function AdminEquipment() {
  const [items, setItems] = useState<ManagedEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id: string; nome: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = () =>
    adminFetch<{ rows: ManagedEquipment[] }>(`/api/admin-equipment?search=${encodeURIComponent(search)}`).then((response) => {
      setItems(response.rows);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, [search]);

  const saveEdit = async () => {
    if (!editing) return;
    await adminFetch("/api/admin-update-equipment", {
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
          <h1 className="text-3xl font-semibold text-ink">Equipamentos</h1>
          <p className="mt-2 text-sm text-stone-600">Gerencie o catalogo de equipamentos exibido no formulario publico.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input-base"
            placeholder="Pesquisar equipamento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="button-primary" onClick={() => setEditing({ id: "", nome: "" })}>
            Novo equipamento
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Carregando equipamentos..." />
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
              {items.map((item) => (
                <tr key={item.id} className="border-t border-stone-100">
                  <td className="py-3">{item.nome}</td>
                  <td className="py-3">{item.ativo ? "Ativo" : "Inativo"}</td>
                  <td className="py-3">{item.usage_count ?? 0}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="button-secondary" onClick={() => setEditing({ id: item.id, nome: item.nome })}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={async () => {
                          await adminFetch("/api/admin-update-equipment", {
                            method: "POST",
                            body: JSON.stringify({
                              action: "toggle",
                              id: item.id,
                              ativo: !item.ativo,
                            }),
                          });
                          await load();
                        }}
                      >
                        {item.ativo ? "Inativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={(item.usage_count ?? 0) > 0}
                        onClick={() => setConfirmDelete(item.id)}
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
          <h2 className="text-lg font-semibold text-ink">{editing.id ? "Editar equipamento" : "Novo equipamento"}</h2>
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
        title="Excluir equipamento"
        message="Essa acao so sera permitida para equipamentos nunca utilizados."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await adminFetch("/api/admin-update-equipment", {
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
