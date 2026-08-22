import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AriaAttributes,
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { inputClass } from './ui';

export interface ComboboxOption {
  value: number;
  label: string;
  /** Texto secundario (cliente, stock…) mostrado en gris a la derecha/abajo. */
  sublabel?: string;
}

type ComboboxAriaProps = Pick<
  AriaAttributes,
  'aria-describedby' | 'aria-invalid' | 'aria-label' | 'aria-required'
>;

interface Props extends ComboboxAriaProps {
  value: number | undefined;
  onChange: (value: number | undefined, option?: ComboboxOption) => void;
  options: ComboboxOption[];
  id?: string;
  placeholder?: string;
  /** Etiqueta de la opción "sin selección". Si se omite, no se ofrece limpiar. */
  emptyLabel?: string;
  hasError?: boolean;
  disabled?: boolean;
  name?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

interface PopoverPosition {
  direction: 'up' | 'down';
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

const POPOVER_GAP = 6;
const VIEWPORT_MARGIN = 8;
const IDEAL_POPOVER_HEIGHT = 320;
const MIN_COMFORTABLE_HEIGHT = 176;
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/** Quita acentos y pasa a minúsculas para buscar de forma tolerante. */
const norm = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Select con búsqueda: input filtrable + navegación por teclado. */
export const Combobox = forwardRef<HTMLButtonElement, Props>(function Combobox({
  value,
  onChange,
  options,
  id,
  placeholder = 'Seleccioná…',
  emptyLabel,
  hasError = false,
  disabled = false,
  name,
  onBlur,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  'aria-required': ariaRequired,
}, forwardedRef) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const listId = `${fieldId}-listbox`;
  const emptyOptionId = `${listId}-empty`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<PopoverPosition>({
    direction: 'down',
    left: 0,
    maxHeight: IDEAL_POPOVER_HEIGHT,
    top: 0,
    width: 0,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const setTriggerRef = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const normalizedQuery = norm(query.trim());
    if (!normalizedQuery) return options;
    return options.filter(
      (option) =>
        norm(option.label).includes(normalizedQuery) ||
        (option.sublabel ? norm(option.sublabel).includes(normalizedQuery) : false),
    );
  }, [options, query]);

  const activeDescendant =
    open && active === -1 && emptyLabel
      ? emptyOptionId
      : open && active >= 0 && filtered[active]
        ? `${listId}-option-${active}`
        : undefined;

  const updatePosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportBottom = viewportTop + viewportHeight;
    const viewportRight = viewportLeft + viewportWidth;

    const spaceBelow = Math.max(0, viewportBottom - rect.bottom - POPOVER_GAP - VIEWPORT_MARGIN);
    const spaceAbove = Math.max(0, rect.top - viewportTop - POPOVER_GAP - VIEWPORT_MARGIN);
    const direction =
      spaceBelow >= MIN_COMFORTABLE_HEIGHT || spaceBelow >= spaceAbove ? ('down' as const) : ('up' as const);
    const availableHeight = direction === 'down' ? spaceBelow : spaceAbove;
    const width = Math.max(0, Math.min(rect.width, viewportWidth - VIEWPORT_MARGIN * 2));
    const left = Math.min(
      Math.max(rect.left, viewportLeft + VIEWPORT_MARGIN),
      Math.max(viewportLeft + VIEWPORT_MARGIN, viewportRight - width - VIEWPORT_MARGIN),
    );

    setPosition({
      direction,
      left,
      maxHeight: Math.min(IDEAL_POPOVER_HEIGHT, availableHeight),
      top: direction === 'down' ? rect.bottom + POPOVER_GAP : rect.top - POPOVER_GAP,
      width,
    });
  }, []);

  // El popover queda fuera del scroller. Dentro de un modal se monta como
  // descendiente del diálogo para conservar el árbol accesible.
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    const visualViewport = window.visualViewport;
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    if (rootRef.current) resizeObserver?.observe(rootRef.current);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    visualViewport?.addEventListener('resize', updatePosition);
    visualViewport?.addEventListener('scroll', updatePosition);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      visualViewport?.removeEventListener('resize', updatePosition);
      visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [open, updatePosition]);

  // Cerrar al interactuar fuera tanto del disparador como del portal.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Al abrir: enfocar el buscador y posicionar el activo en el seleccionado.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const selectedIndex = selected ? options.findIndex((option) => option.value === selected.value) : -1;
    setActive(selectedIndex >= 0 ? selectedIndex : value === undefined && emptyLabel ? -1 : 0);
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
    // La selección se toma en el momento de apertura, no durante una búsqueda activa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mantener visible la opción activa sin desplazar el modal que queda debajo.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const option = listRef.current.querySelector<HTMLElement>(`[data-option-index="${active}"]`);
    option?.scrollIntoView?.({ block: 'nearest' });
  }, [active, filtered.length, open]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  const moveFocusFromTrigger = (backward: boolean) => {
    const trigger = triggerRef.current;
    const scope = rootRef.current?.closest<HTMLElement>('[role="dialog"]');
    if (!trigger || !scope) {
      close(true);
      return;
    }

    const focusables = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && !element.closest('[hidden]');
    });
    const currentIndex = focusables.indexOf(trigger);
    const next = backward
      ? focusables[currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1]
      : focusables[currentIndex < 0 || currentIndex === focusables.length - 1 ? 0 : currentIndex + 1];
    close();
    next?.focus();
  };

  const pick = (option: ComboboxOption | null) => {
    if (option) onChange(option.value, option);
    else onChange(undefined, undefined);
    close(true);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filtered.length === 0) {
        if (emptyLabel) setActive(-1);
        return;
      }
      setActive((current) => (current < 0 ? 0 : Math.min(current + 1, filtered.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current <= 0 && emptyLabel ? -1 : Math.max(current - 1, 0)));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active === -1 && emptyLabel) pick(null);
      else if (filtered[active]) pick(filtered[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      moveFocusFromTrigger(event.shiftKey);
    }
  };

  const popoverStyle: CSSProperties = {
    left: position.left,
    maxHeight: position.maxHeight,
    top: position.top,
    width: position.width,
    transform: position.direction === 'up' ? 'translateY(-100%)' : undefined,
  };

  const popover = open ? (
    <div
      ref={popoverRef}
      style={popoverStyle}
      className="fixed z-[70] flex min-w-0 flex-col overflow-hidden rounded-lg border border-border-strong bg-surface shadow-lg"
      data-placement={position.direction}
    >
      <div className="shrink-0 border-b border-border p-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar…"
          aria-label="Buscar opciones"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeDescendant}
          autoComplete="off"
          className="min-h-11 w-full min-w-0 rounded-md border border-border bg-surface-2 px-3 py-2 text-base text-text outline-none placeholder:text-text-3 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:min-h-0 sm:text-[14px]"
        />
      </div>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-labelledby={fieldId}
        className="ofx-scroll min-h-0 flex-1 overscroll-contain overflow-y-auto py-1"
      >
        {emptyLabel ? (
          <li
            id={emptyOptionId}
            role="option"
            aria-selected={value === undefined}
            data-option-index={-1}
            onMouseEnter={() => setActive(-1)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(null)}
            className={`flex min-h-11 cursor-pointer items-center px-3 py-2 text-[13.5px] text-text-3 sm:min-h-0 ${
              active === -1 ? 'bg-surface-2' : ''
            }`}
          >
            {emptyLabel}
          </li>
        ) : null}

        {filtered.length === 0 ? (
          <li className="px-3 py-3 text-center text-[13px] text-text-3">Sin resultados</li>
        ) : (
          filtered.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === active;
            return (
              <li
                key={option.value}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                data-option-index={index}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 py-2 text-[13.5px] sm:min-h-0 ${
                  isActive ? 'bg-primary-soft' : ''
                } ${isSelected ? 'font-bold text-primary' : 'text-text'}`}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.sublabel ? (
                  <span className="min-w-0 max-w-[45%] shrink truncate text-[12px] text-text-3">
                    {option.sublabel}
                  </span>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={setTriggerRef}
        type="button"
        id={fieldId}
        name={name}
        role={open ? undefined : 'combobox'}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-activedescendant={activeDescendant}
        aria-describedby={ariaDescribedBy}
        aria-invalid={hasError ? true : ariaInvalid}
        aria-label={ariaLabel}
        aria-required={ariaRequired}
        disabled={disabled}
        onBlur={onBlur}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        className={`${inputClass(hasError)} flex touch-manipulation items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-text' : 'text-text-3'}`}>
          {selected ? selected.label : placeholder}
          {selected?.sublabel ? <span className="text-text-3"> — {selected.sublabel}</span> : null}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-text-3 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {popover && typeof document !== 'undefined'
        ? createPortal(popover, triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? document.body)
        : null}
    </div>
  );
});
