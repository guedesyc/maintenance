import type { Unit } from "@shared/types";
import SearchableSelect from "./SearchableSelect";

interface UnitAutocompleteProps {
  units: Unit[];
  loading: boolean;
  error: string | null;
  value: Unit | null;
  inputValue: string;
  fieldError?: string | null;
  disabled?: boolean;
  onInputValueChange: (value: string) => void;
  onSelect: (unit: Unit) => void;
}

export default function UnitAutocomplete({
  units,
  loading,
  error,
  value,
  inputValue,
  fieldError,
  disabled,
  onInputValueChange,
  onSelect,
}: UnitAutocompleteProps) {
  return (
    <SearchableSelect
      items={units}
      loading={loading}
      error={error}
      fieldError={fieldError}
      value={value}
      inputValue={inputValue}
      disabled={disabled}
      onInputValueChange={onInputValueChange}
      onSelect={onSelect}
      label="Unidade"
      placeholder="Selecione uma unidade"
      noResultsText="Nenhuma unidade encontrada."
    />
  );
}
