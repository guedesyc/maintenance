import { Plus } from "lucide-react";
import type { EquipmentCatalogItem } from "@shared/types";
import type { EquipmentDraft } from "@/types/ui";
import EquipmentRow from "./EquipmentRow";

interface EquipmentListProps {
  title?: string;
  description?: string;
  addLabel?: string;
  manual?: boolean;
  items: EquipmentDraft[];
  options: EquipmentCatalogItem[];
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  onAdd: () => void;
  onUpdate: (localId: string, recipe: (item: EquipmentDraft) => EquipmentDraft) => void;
  onRemove: (localId: string) => void;
}

export default function EquipmentList({
  title = "Equipamentos",
  description = "Adicione quantos equipamentos forem necessarios. O ADM gerara os patrimonios dos itens da empresa.",
  addLabel = "Adicionar equipamento",
  manual = false,
  items,
  options,
  loading,
  error,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
}: EquipmentListProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <EquipmentRow
            key={item.localId}
            item={item}
            manual={manual}
            options={options}
            loading={loading}
            error={error}
            disabled={disabled}
            canRemove={items.length > 1 || index > 0}
            onTextChange={(value) =>
              onUpdate(item.localId, (current) => ({
                ...current,
                equipmentText: value,
                equipment: current.equipment?.nome === value ? current.equipment : null,
              }))
            }
            onSelect={(equipment) =>
              onUpdate(item.localId, (current) => ({
                ...current,
                equipment,
                equipmentText: equipment.nome,
              }))
            }
            onStatusChange={(status) => onUpdate(item.localId, (current) => ({ ...current, status }))}
            onCustomerEquipmentChange={(customerEquipment) =>
              onUpdate(item.localId, (current) => ({
                ...current,
                customerEquipment,
                customerPatrimonio: customerEquipment ? current.customerPatrimonio : "",
              }))
            }
            onCustomerPatrimonioChange={(customerPatrimonio) =>
              onUpdate(item.localId, (current) => ({ ...current, customerPatrimonio }))
            }
            onRemove={() => onRemove(item.localId)}
          />
        ))}
      </div>

      <button type="button" className="button-secondary w-full py-3" disabled={disabled} onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        {addLabel}
      </button>
    </section>
  );
}
