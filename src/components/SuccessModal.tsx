import { X } from "lucide-react";
import type { RegistrationResult } from "@shared/types";

interface SuccessModalProps {
  result: RegistrationResult | null;
  onReset: () => void;
}

export default function SuccessModal({ result, onReset }: SuccessModalProps) {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/40 px-4 py-8">
      <div className="mx-auto max-w-2xl panel p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            Sucesso
          </span>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-brand-200 hover:text-brand-700"
            aria-label="Fechar e iniciar novo cadastro"
            onClick={onReset}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-ink">Cadastro finalizado com sucesso!</h2>
        <p className="mt-2 text-sm text-stone-600">Unidade: {result.unidade_nome}</p>
        <div className="mt-6 space-y-4">
          {result.equipamentos.map((item) => (
            <article key={item.patrimonio_id} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <h3 className="font-semibold text-ink">{item.equipamento_nome}</h3>
              <p className="mt-2 text-sm text-stone-700">Patrimonio: {item.numero_patrimonio}</p>
              <p className="mt-1 text-sm text-stone-700">Status: {item.status}</p>
            </article>
          ))}
        </div>
        <button type="button" className="button-primary mt-8 w-full" onClick={onReset}>
          Realizar novo cadastro
        </button>
      </div>
    </div>
  );
}
