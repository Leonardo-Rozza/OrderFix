import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { inputClass } from './ui';

export interface ComboboxOption {
  value: number;
  label: string;
  /** Texto secundario (cliente, stock…) mostrado en gris a la derecha/abajo. */
  sublabel?: string;
}

interface Props {
  value: number | undefined;
  onChange: (value: number | undefined, option?: ComboboxOption) => void;
  options: ComboboxOption[];
  id?: string;
  placeholder?: string;
  /** Etiqueta de la opción "sin selección". Si se omite, no se ofrece limpiar. */
  emptyLabel?: string;
  hasError?: boolean;
  disabled?: boolean;
}

/** Quita acentos y pasa a minúsculas para buscar de forma tolerante. */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Select con búsqueda: input filtrable + navegación por teclado. */
export const Combobox = ({
  value,
  onChange,
  options,
  id,
  placeholder = 'Seleccioná…',
  emptyLabel,
  hasError = false,
  disabled = false,
}: Props) => {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const listId = `${fieldId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => norm(o.label).includes(q) || (o.sublabel ? norm(o.sublabel).includes(q) : false),
    );
  }, [options, query]);

  // Cerrar al hacer click afuera.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Al abrir: enfocar el buscador y posicionar el activo en el seleccionado.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const idx = selected ? filtered.findIndex((o) => o.value === selected.value) : 0;
    setActive(idx >= 0 ? idx : 0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mantener visible la opción activa.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const pick = (opt: ComboboxOption | null) => {
    if (opt) onChange(opt.value, opt);
    else onChange(undefined, undefined);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) pick(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {/* Disparador */}
      <button
        type="button"
        id={fieldId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`${inputClass(hasError)} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${selected ? 'text-text' : 'text-text-3'}`}>
          {selected ? selected.label : placeholder}
          {selected?.sublabel && <span className="text-text-3"> — {selected.sublabel}</span>}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-text-3 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-border-strong bg-surface shadow-lg">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Buscar…"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-[14px] text-text outline-none placeholder:text-text-3 focus:border-primary"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {emptyLabel && (
              <li
                role="option"
                aria-selected={value === undefined}
                onMouseEnter={() => setActive(-1)}
                onClick={() => pick(null)}
                className={`cursor-pointer px-3 py-2 text-[13.5px] text-text-3 ${
                  active === -1 ? 'bg-surface-2' : ''
                }`}
              >
                {emptyLabel}
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-[13px] text-text-3">Sin resultados</li>
            ) : (
              filtered.map((o, i) => {
                const isSel = o.value === value;
                const isActive = i === active;
                return (
                  <li
                    key={o.value}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-[13.5px] ${
                      isActive ? 'bg-primary-soft' : ''
                    } ${isSel ? 'font-bold text-primary' : 'text-text'}`}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.sublabel && (
                      <span className="shrink-0 truncate text-[12px] text-text-3">{o.sublabel}</span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
