import { Trash2 } from "lucide-react";
import type { EquipmentCatalogItem, PatrimonioType } from "@shared/types";
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
  onPatrimonioTypeChange: (value: PatrimonioType) => void;
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
  onPatrimonioTypeChange,
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
        <label className="mb-2 block text-sm font-medium text-ink">Tipo de patrimonio</label>
        <select
          className="input-base"
          value={item.patrimonioType}
          disabled={disabled}
          onChange={(event) => onPatrimonioTypeChange(event.target.value as PatrimonioType)}
        >
          <option value="PROPRIO">Proprio</option>
          <option value="CLIENTE">Cliente</option>
          <option value="COMODATO">Comodato</option>
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Patrimonio</label>
        {item.patrimonioType !== "PROPRIO" ? (
          <input
            className="input-base"
            value={item.customerPatrimonio}
            disabled={disabled}
            placeholder={item.patrimonioType === "COMODATO" ? "Numero do comodato" : "Numero do cliente"}
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
