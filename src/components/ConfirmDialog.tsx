interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4">
      <div className="panel max-w-md p-6">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-3 text-sm text-stone-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="button-primary" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
