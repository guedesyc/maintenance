import { useDeferredValue, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { normalizeText } from "@shared/normalizeText";

interface BaseItem {
  id: string;
  nome: string;
}

interface SearchableSelectProps<T extends BaseItem> {
  label: string;
  placeholder: string;
  value: T | null;
  inputValue: string;
  items: T[];
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  noResultsText: string;
  onInputValueChange: (value: string) => void;
  onSelect: (item: T) => void;
}

export default function SearchableSelect<T extends BaseItem>({
  label,
  placeholder,
  value,
  inputValue,
  items,
  loading,
  error,
  disabled,
  noResultsText,
  onInputValueChange,
  onSelect,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputId = useId();
  const listId = `${inputId}-list`;
  const deferredValue = useDeferredValue(inputValue);

  const filteredItems = useMemo(() => {
    const term = normalizeText(deferredValue || "");
    if (!term) return items;
    return items.filter((item) => normalizeText(item.nome).includes(term));
  }, [deferredValue, items]);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className="input-base pr-12"
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            onInputValueChange(event.target.value);
            setOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={(event) => {
            if (!open && event.key === "ArrowDown") {
              setOpen(true);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightedIndex((current) => Math.min(current + 1, Math.max(filteredItems.length - 1, 0)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightedIndex((current) => Math.max(current - 1, 0));
            }
            if (event.key === "Enter" && open && filteredItems[highlightedIndex]) {
              event.preventDefault();
              const option = filteredItems[highlightedIndex];
              onSelect(option);
              setOpen(false);
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={filteredItems[highlightedIndex]?.id}
        />
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
      </div>
      {value && <p className="mt-2 text-xs text-brand-700">Selecionado: {value.nome}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {open && (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-soft">
          {loading ? (
            <p className="px-3 py-2 text-sm text-stone-500">Carregando...</p>
          ) : filteredItems.length > 0 ? (
            <ul id={listId} role="listbox">
              {filteredItems.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      index === highlightedIndex ? "bg-brand-100 text-brand-800" : "hover:bg-stone-100"
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    {item.nome}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-stone-500">{noResultsText}</p>
          )}
        </div>
      )}
    </div>
  );
}
