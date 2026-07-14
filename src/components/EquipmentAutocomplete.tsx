import type { EquipmentCatalogItem } from "@shared/types";
import SearchableSelect from "./SearchableSelect";

interface EquipmentAutocompleteProps {
  items: EquipmentCatalogItem[];
  loading: boolean;
  error: string | null;
  value: EquipmentCatalogItem | null;
  inputValue: string;
  disabled?: boolean;
  onInputValueChange: (value: string) => void;
  onSelect: (item: EquipmentCatalogItem) => void;
}

export default function EquipmentAutocomplete(props: EquipmentAutocompleteProps) {
  return (
    <SearchableSelect
      {...props}
      label="Nome do Equipamento"
      placeholder="Selecione um equipamento"
      noResultsText="Nenhum equipamento encontrado."
    />
  );
}
