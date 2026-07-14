import { Trash2 } from "lucide-react";
import type { EquipmentCatalogItem } from "@shared/types";
import type { EquipmentDraft } from "@/types/ui";
import EquipmentAutocomplete from "./EquipmentAutocomplete";
import StatusSelector from "./StatusSelector";

interface EquipmentRowProps {
  item: EquipmentDraft;
  manual?: boolean;
  options: EquipmentCatalogItem[];
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  canRemove: boolean;
  onTextChange: (value: string) => void;
  onSelect: (equipment: EquipmentCatalogItem) => void;
  onStatusChange: (status: EquipmentDraft["status"]) => void;
  onCustomerEquipmentChange: (value: boolean) => void;
  onCustomerPatrimonioChange: (value: string) => void;
  onRemove: () => void;
}

export default function EquipmentRow({
  item,
  manual = false,
  options,
  loading,
  error,
  disabled,
  canRemove,
  onTextChange,
  onSelect,
  onStatusChange,
  onCustomerEquipmentChange,
  onCustomerPatrimonioChange,
  onRemove,
}: EquipmentRowProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-stone-200 bg-stone-50/80 p-4 xl:grid-cols-[minmax(0,2fr)_180px_220px_160px]">
      {manual ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-ink">Item faltante</label>
          <input
            className="input-base"
            value={item.equipmentText}
            disabled={disabled}
            placeholder="Digite o item"
            onChange={(event) => onTextChange(event.target.value)}
          />
        </div>
      ) : (
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
      )}
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Equipamento do Cliente</label>
        <select
          className="input-base"
          value={item.customerEquipment ? "SIM" : "NAO"}
          disabled={disabled}
          onChange={(event) => onCustomerEquipmentChange(event.target.value === "SIM")}
        >
          <option value="NAO">Nao</option>
          <option value="SIM">Sim</option>
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Patrimonio</label>
        {item.customerEquipment ? (
          <input
            className="input-base"
            value={item.customerPatrimonio}
            disabled={disabled}
            placeholder="Digite a numeracao"
            onChange={(event) => onCustomerPatrimonioChange(event.target.value)}
          />
        ) : (
          <div className="input-base flex items-center text-stone-500">ADM gera depois</div>
        )}
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
