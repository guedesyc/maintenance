export default function LoadingSpinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-stone-600" role="status" aria-live="polite">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      <span>{label}</span>
    </div>
  );
}
