import { Trash2 } from "lucide-react";
import type { EquipmentCatalogItem } from "@shared/types";
import type { EquipmentDraft } from "@/types/ui";
import EquipmentAutocomplete from "./EquipmentAutocomplete";
import StatusSelector from "./StatusSelector";

interface EquipmentRowProps {
  item: EquipmentDraft;
  options: EquipmentCatalogItem[];
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  canRemove: boolean;
  onTextChange: (value: string) => void;
  onSelect: (equipment: EquipmentCatalogItem) => void;
  onStatusChange: (status: EquipmentDraft["status"]) => void;
  onRemove: () => void;
}

export default function EquipmentRow({
  item,
  options,
  loading,
  error,
  disabled,
  canRemove,
  onTextChange,
  onSelect,
  onStatusChange,
  onRemove,
}: EquipmentRowProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 lg:grid-cols-[minmax(0,2fr)_220px_160px]">
      <EquipmentAutocomplete
        items={options}
        loading={loading}
        error={error}
        value={item.equipment}
        inputValue={item.equipmentText}
        disabled={disabled}
        onInputValueChange={onTextChange}
        onSelect={onSelect}
      />
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Patrimonio</label>
        <div className="input-base flex items-center text-stone-500">Sera gerado ao finalizar</div>
      </div>
      <div className="flex flex-col gap-4">
        <StatusSelector value={item.status} disabled={disabled} onChange={onStatusChange} />
        <button
          type="button"
          className="button-secondary w-full"
          disabled={!canRemove || disabled}
          onClick={onRemove}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remover
        </button>
      </div>
    </div>
  );
}
