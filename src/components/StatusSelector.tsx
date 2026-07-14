import type { Status } from "@shared/types";

interface StatusSelectorProps {
  value: Status;
  disabled?: boolean;
  onChange: (value: Status) => void;
}

export default function StatusSelector({ value, disabled, onChange }: StatusSelectorProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink">Status</label>
      <select
        className="input-base"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Status)}
      >
        <option value="ATIVO">ATIVO</option>
        <option value="INATIVO">INATIVO</option>
      </select>
    </div>
  );
}
