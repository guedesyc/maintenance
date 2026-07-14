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

function createEmptyDraft(): EquipmentDraft {
  return {
    localId: crypto.randomUUID(),
    equipment: null,
    equipmentText: "",
    status: "ATIVO",
  };
}

export default function Home() {
  const units = useUnits();
  const equipment = useEquipmentSearch();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitText, setUnitText] = useState("");
  const [items, setItems] = useState<EquipmentDraft[]>([createEmptyDraft()]);
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
    if (items.length === 0) {
      setError("Adicione pelo menos um equipamento.");
      return;
    }
    if (items.some((item) => !item.equipment)) {
      setError("Selecione um equipamento valido em todas as linhas.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: RegistrationPayload = {
      request_id: requestId,
      unidade_id: unit.id,
      equipamentos: items.map((item) => ({
        equipamento_id: item.equipment!.id,
        status: item.status,
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
                Selecione sua unidade, adicione os equipamentos e finalize o cadastro para gerar os patrimonios.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
                O formulario foi desenhado para ser rapido no computador e no celular, com validacao completa e
                geracao segura de patrimonios apenas no momento da finalizacao.
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
                <li>3. Clique em "Gerar patrimonios e finalizar cadastro!" para concluir.</li>
              </ol>
              <div className="mt-8 rounded-3xl border border-brand-700/60 bg-white/10 p-4 text-sm text-brand-50">
                Os numeros de patrimonio nao sao gerados antes da confirmacao final e o mesmo request_id evita
                duplicidades em caso de reenvio.
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

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button type="button" className="button-primary w-full py-4 text-lg" disabled={loading} onClick={submit}>
              {loading ? "Gerando patrimonios..." : "Gerar patrimonios e finalizar cadastro!"}
            </button>
          </div>
        </section>
      </div>
      <SuccessModal result={result} onReset={resetForm} />
    </div>
  );
}
