import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { createRegistration } from "@/services/registrationService";
import { useUnits } from "@/hooks/useUnits";
import { useEquipmentSearch } from "@/hooks/useEquipmentSearch";
import { createRequestId } from "@shared/requestId";
import type { RegistrationPayload, Unit } from "@shared/types";
import type { EquipmentDraft } from "@/types/ui";
import UnitAutocomplete from "@/components/UnitAutocomplete";
import EquipmentList from "@/components/EquipmentList";
import SuccessModal from "@/components/SuccessModal";
import AppFooter from "@/components/AppFooter";

function createEmptyDraft(mode: EquipmentDraft["mode"] = "catalog"): EquipmentDraft {
  return {
    localId: crypto.randomUUID(),
    mode,
    equipment: null,
    equipmentText: "",
    status: "ATIVO",
    customerEquipment: false,
    customerPatrimonio: "",
  };
}

export default function Home() {
  const units = useUnits();
  const equipment = useEquipmentSearch();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitText, setUnitText] = useState("");
  const [items, setItems] = useState<EquipmentDraft[]>([createEmptyDraft()]);
  const [hasMissingItems, setHasMissingItems] = useState(false);
  const [missingItems, setMissingItems] = useState<EquipmentDraft[]>([]);
  const [requestId, setRequestId] = useState(createRequestId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof createRegistration>> | null>(null);

  const disabled = loading || Boolean(result);

  const submit = async () => {
    if (!unit) {
      setError("Selecione uma unidade valida.");
      return;
    }
    const allItems = [...items, ...(hasMissingItems ? missingItems : [])];

    if (allItems.length === 0) {
      setError("Adicione pelo menos um equipamento.");
      return;
    }

    if (items.some((item) => !item.equipment)) {
      setError("Selecione um equipamento valido em todas as linhas.");
      return;
    }

    if (hasMissingItems && missingItems.some((item) => !item.equipmentText.trim())) {
      setError("Digite o nome de todos os itens faltantes.");
      return;
    }

    if (allItems.some((item) => item.customerEquipment && !item.customerPatrimonio.trim())) {
      setError("Informe o patrimonio de todos os equipamentos do cliente.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: RegistrationPayload = {
      request_id: requestId,
      unidade_id: unit.id,
      equipamentos: allItems.map((item) => ({
        ...(item.mode === "catalog" ? { equipamento_id: item.equipment!.id } : { equipamento_nome: item.equipmentText.trim() }),
        status: item.status,
        equipamento_cliente: item.customerEquipment,
        patrimonio_cliente: item.customerEquipment ? item.customerPatrimonio.trim() : undefined,
      })),
    };

    try {
      const response = await createRegistration(payload);
      setResult(response);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Falha ao finalizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUnit(null);
    setUnitText("");
    setItems([createEmptyDraft()]);
    setHasMissingItems(false);
    setMissingItems([]);
    setResult(null);
    setError(null);
    setRequestId(createRequestId());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-haze px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <section className="panel overflow-hidden">
          <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  Cadastro de Equipamentos
                </span>
                <Link to="/admin/login" className="button-secondary py-2 text-sm">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Painel ADM
                </Link>
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">
                Selecione sua unidade, adicione os equipamentos e envie o cadastro para o painel ADM.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
                O formulario foi desenhado para ser rapido no computador e no celular, com validacao completa e
                geracao segura de patrimonios pelo painel administrativo.
              </p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-4">
                  <dt className="text-xs uppercase tracking-[0.2em] text-brand-700">Patrimonios</dt>
                  <dd className="mt-2 text-2xl font-semibold text-ink">Unicos</dd>
                </div>
                <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-4">
                  <dt className="text-xs uppercase tracking-[0.2em] text-brand-700">Status</dt>
                  <dd className="mt-2 text-2xl font-semibold text-ink">Ativo ou Inativo</dd>
                </div>
                <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-4">
                  <dt className="text-xs uppercase tracking-[0.2em] text-brand-700">Cadastro</dt>
                  <dd className="mt-2 text-2xl font-semibold text-ink">Transacional</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-[2rem] bg-brand-900 p-6 text-white shadow-soft">
              <p className="text-xs uppercase tracking-[0.25em] text-brand-100">Como funciona</p>
              <ol className="mt-5 space-y-4 text-sm text-brand-50">
                <li>1. Selecione uma unidade valida a partir do catalogo importado.</li>
                <li>2. Adicione um ou mais equipamentos e escolha o status de cada item.</li>
                <li>3. Clique em "Enviar cadastro" para concluir. O ADM gerara os patrimonios depois.</li>
              </ol>
              <div className="mt-8 rounded-3xl border border-brand-700/60 bg-white/10 p-4 text-sm text-brand-50">
                Equipamentos do cliente exigem patrimonio manual no proprio formulario. Os demais ficam pendentes para
                geracao sequencial no ADM.
              </div>
            </div>
          </div>
        </section>

        <section className="panel mt-8 p-6 md:p-8">
          <div className="grid gap-8">
            <UnitAutocomplete
              units={units.data}
              loading={units.loading}
              error={units.error}
              value={unit}
              inputValue={unitText}
              disabled={disabled}
              onInputValueChange={(value) => {
                setUnitText(value);
                setUnit(unit?.nome === value ? unit : null);
              }}
              onSelect={(selected) => {
                setUnit(selected);
                setUnitText(selected.nome);
              }}
            />

            <EquipmentList
              items={items}
              options={equipment.data}
              loading={equipment.loading}
              error={equipment.error}
              disabled={disabled}
              onAdd={() => setItems((current) => [...current, createEmptyDraft()])}
              onUpdate={(localId, recipe) =>
                setItems((current) => current.map((item) => (item.localId === localId ? recipe(item) : item)))
              }
              onRemove={(localId) =>
                setItems((current) => {
                  const next = current.filter((item) => item.localId !== localId);
                  return next.length > 0 ? next : [createEmptyDraft()];
                })
              }
            />

            <section className="rounded-3xl border border-stone-200 bg-white p-4">
              <label className="mb-2 block text-sm font-medium text-ink">Tem algum item que nao esta na lista?</label>
              <select
                className="input-base"
                value={hasMissingItems ? "SIM" : "NAO"}
                disabled={disabled}
                onChange={(event) => {
                  const next = event.target.value === "SIM";
                  setHasMissingItems(next);
                  setMissingItems((current) => (next && current.length === 0 ? [createEmptyDraft("manual")] : current));
                }}
              >
                <option value="NAO">Nao</option>
                <option value="SIM">Sim</option>
              </select>
            </section>

            {hasMissingItems && (
              <EquipmentList
                title="Itens faltantes"
                description="Digite os itens que nao aparecem na lista. Estes campos nao usam sugestao automatica."
                addLabel="Adicionar item faltante"
                manual
                items={missingItems}
                options={[]}
                loading={false}
                error={null}
                disabled={disabled}
                onAdd={() => setMissingItems((current) => [...current, createEmptyDraft("manual")])}
                onUpdate={(localId, recipe) =>
                  setMissingItems((current) => current.map((item) => (item.localId === localId ? recipe(item) : item)))
                }
                onRemove={(localId) =>
                  setMissingItems((current) => {
                    const next = current.filter((item) => item.localId !== localId);
                    return next.length > 0 ? next : [createEmptyDraft("manual")];
                  })
                }
              />
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button type="button" className="button-primary w-full py-4 text-lg" disabled={loading} onClick={submit}>
              {loading ? "Enviando cadastro..." : "Enviar cadastro"}
            </button>
          </div>
        </section>
        <AppFooter />
      </div>
      <SuccessModal result={result} onReset={resetForm} />
    </div>
  );
}
