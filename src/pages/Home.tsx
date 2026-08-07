import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, RotateCcw, ShieldCheck } from "lucide-react";
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

const LOCAL_DRAFT_KEY = "maintenance-registration-draft";

interface EquipmentFieldErrors {
  equipment?: string;
  patrimonio?: string;
}

interface FormErrors {
  unit?: string;
  items: Record<string, EquipmentFieldErrors>;
  missingItems: Record<string, EquipmentFieldErrors>;
}

interface LocalRegistrationDraft {
  version: 1;
  savedAt: string;
  requestId: string;
  unit: Unit | null;
  unitText: string;
  items: EquipmentDraft[];
  hasMissingItems: boolean;
  missingItems: EquipmentDraft[];
}

const emptyFormErrors = (): FormErrors => ({
  items: {},
  missingItems: {},
});

function createEmptyDraft(mode: EquipmentDraft["mode"] = "catalog"): EquipmentDraft {
  return {
    localId: crypto.randomUUID(),
    mode,
    equipment: null,
    equipmentText: "",
    status: "ATIVO",
    customerEquipment: false,
    customerPatrimonio: "",
    patrimonioType: "PROPRIO",
    noPatrimonio: false,
  };
}

function scrollToFirstInvalidField() {
  window.setTimeout(() => {
    const field = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus();
  }, 0);
}

function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
  const [notice, setNotice] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>(emptyFormErrors);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof createRegistration>> | null>(null);

  const disabled = loading || Boolean(result);

  useEffect(() => {
    setHasSavedDraft(Boolean(localStorage.getItem(LOCAL_DRAFT_KEY)));
  }, []);

  useEffect(() => {
    if (result) return;

    const draft: LocalRegistrationDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      requestId,
      unit,
      unitText,
      items,
      hasMissingItems,
      missingItems,
    };

    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
    setHasSavedDraft(true);
  }, [hasMissingItems, items, missingItems, requestId, result, unit, unitText]);

  const validateForm = () => {
    const nextErrors = emptyFormErrors();
    let valid = true;

    if (!unit) {
      nextErrors.unit = "Selecione uma unidade valida.";
      valid = false;
    }

    items.forEach((item) => {
      if (!item.equipment) {
        nextErrors.items[item.localId] = {
          ...nextErrors.items[item.localId],
          equipment: "Selecione um equipamento valido.",
        };
        valid = false;
      }
    });

    if (hasMissingItems) {
      missingItems.forEach((item) => {
        if (!item.equipmentText.trim()) {
          nextErrors.missingItems[item.localId] = {
            ...nextErrors.missingItems[item.localId],
            equipment: "Digite o nome do item faltante.",
          };
          valid = false;
        }
      });
    }

    const markPatrimonioError = (item: EquipmentDraft, group: "items" | "missingItems") => {
      if (item.patrimonioType === "PROPRIO" || item.noPatrimonio || item.customerPatrimonio.trim()) return;

      nextErrors[group][item.localId] = {
        ...nextErrors[group][item.localId],
        patrimonio: "Informe o patrimonio ou marque Nao tem patrimonio.",
      };
      valid = false;
    };

    items.forEach((item) => markPatrimonioError(item, "items"));
    if (hasMissingItems) {
      missingItems.forEach((item) => markPatrimonioError(item, "missingItems"));
    }

    setFormErrors(nextErrors);
    return valid;
  };

  const clearUnitError = () => {
    setError(null);
    setNotice(null);
    setFormErrors((current) => ({ ...current, unit: undefined }));
  };

  const clearItemError = (group: "items" | "missingItems", localId: string, field?: keyof EquipmentFieldErrors) => {
    setError(null);
    setNotice(null);
    setFormErrors((current) => {
      const groupErrors = { ...current[group] };
      const itemErrors = { ...groupErrors[localId] };

      if (field) {
        delete itemErrors[field];
      } else {
        delete itemErrors.equipment;
        delete itemErrors.patrimonio;
      }

      if (itemErrors.equipment || itemErrors.patrimonio) {
        groupErrors[localId] = itemErrors;
      } else {
        delete groupErrors[localId];
      }

      return {
        ...current,
        [group]: groupErrors,
      };
    });
  };

  const submit = async () => {
    const allItems = [...items, ...(hasMissingItems ? missingItems : [])];

    if (!validateForm()) {
      setError("Corrija os campos destacados em vermelho e tente enviar novamente.");
      scrollToFirstInvalidField();
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    const payload: RegistrationPayload = {
      request_id: requestId,
      unidade_id: unit!.id,
      equipamentos: allItems.map((item) => ({
        ...(item.mode === "catalog" ? { equipamento_id: item.equipment!.id } : { equipamento_nome: item.equipmentText.trim() }),
        status: item.status,
        equipamento_cliente: item.patrimonioType === "CLIENTE",
        tipo_patrimonio: item.patrimonioType,
        sem_patrimonio: item.noPatrimonio,
        patrimonio_cliente: item.patrimonioType !== "PROPRIO" && !item.noPatrimonio ? item.customerPatrimonio.trim() : undefined,
      })),
    };

    try {
      const response = await createRegistration(payload);
      setResult(response);
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setHasSavedDraft(false);
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
    setNotice(null);
    setFormErrors(emptyFormErrors());
    setRequestId(createRequestId());
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    setHasSavedDraft(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveLocalCopy = () => {
    const draft: LocalRegistrationDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      requestId,
      unit,
      unitText,
      items,
      hasMissingItems,
      missingItems,
    };
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
    setHasSavedDraft(true);
    setError(null);
    setNotice("Copia local salva neste navegador e baixada para o computador.");
    downloadJsonFile(draft, `cadastro-equipamentos-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const restoreLocalDraft = () => {
    const storedDraft = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!storedDraft) return;

    try {
      const draft = JSON.parse(storedDraft) as LocalRegistrationDraft;
      setUnit(draft.unit);
      setUnitText(draft.unitText);
      setItems(draft.items.length > 0 ? draft.items : [createEmptyDraft()]);
      setHasMissingItems(draft.hasMissingItems);
      setMissingItems(draft.missingItems);
      setRequestId(draft.requestId || createRequestId());
      setResult(null);
      setError(null);
      setNotice("Rascunho local restaurado.");
      setFormErrors(emptyFormErrors());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Nao foi possivel restaurar o rascunho local.");
    }
  };

  return (
    <div className="min-h-screen bg-haze px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <section className="panel overflow-hidden">
          <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src="/yg-systems-logo.png"
                  alt="YG Systems"
                  className="h-16 w-16 rounded-2xl object-cover shadow-sm"
                />
                <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  Cadastro de Equipamentos
                </span>
                <Link to="/admin/login" className="button-secondary py-2 text-sm">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Painel ADM
                </Link>
                </div>
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
                Equipamentos de Cliente e Comodato exigem patrimonio manual no proprio formulario. Os equipamentos
                Proprios ficam pendentes para geracao sequencial no ADM.
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
              fieldError={formErrors.unit}
              value={unit}
              inputValue={unitText}
              disabled={disabled}
              onInputValueChange={(value) => {
                clearUnitError();
                setUnitText(value);
                setUnit(unit?.nome === value ? unit : null);
              }}
              onSelect={(selected) => {
                clearUnitError();
                setUnit(selected);
                setUnitText(selected.nome);
              }}
            />

            <EquipmentList
              items={items}
              options={equipment.data}
              loading={equipment.loading}
              error={equipment.error}
              fieldErrors={formErrors.items}
              disabled={disabled}
              onAdd={() => setItems((current) => [...current, createEmptyDraft()])}
              onUpdate={(localId, recipe) => {
                clearItemError("items", localId);
                setItems((current) => current.map((item) => (item.localId === localId ? recipe(item) : item)));
              }}
              onRemove={(localId) => {
                clearItemError("items", localId);
                setItems((current) => {
                  const next = current.filter((item) => item.localId !== localId);
                  return next.length > 0 ? next : [createEmptyDraft()];
                });
              }}
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
                  setError(null);
                  setNotice(null);
                  if (!next) {
                    setFormErrors((current) => ({ ...current, missingItems: {} }));
                  }
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
                fieldErrors={formErrors.missingItems}
                disabled={disabled}
                onAdd={() => setMissingItems((current) => [...current, createEmptyDraft("manual")])}
                onUpdate={(localId, recipe) => {
                  clearItemError("missingItems", localId);
                  setMissingItems((current) => current.map((item) => (item.localId === localId ? recipe(item) : item)));
                }}
                onRemove={(localId) => {
                  clearItemError("missingItems", localId);
                  setMissingItems((current) => {
                    const next = current.filter((item) => item.localId !== localId);
                    return next.length > 0 ? next : [createEmptyDraft("manual")];
                  });
                }}
              />
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {notice && (
              <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                {notice}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className="button-secondary w-full py-3" disabled={disabled} onClick={saveLocalCopy}>
                <Download className="mr-2 h-4 w-4" />
                Salvar Copia Local
              </button>
              <button
                type="button"
                className="button-secondary w-full py-3"
                disabled={disabled || !hasSavedDraft}
                onClick={restoreLocalDraft}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar rascunho
              </button>
            </div>

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
