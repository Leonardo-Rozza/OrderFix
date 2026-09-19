import { forwardRef, lazy, Suspense, useId, useRef, useState, type InputHTMLAttributes } from 'react';
import {
  autoUpdate, flip, FloatingFocusManager, FloatingPortal, offset, shift,
  useClick, useDismiss, useFloating, useInteractions, useMergeRefs, useRole,
} from '@floating-ui/react';
import { dateInputError, formatDateInput, normalizeDateInput } from '../utils/dateInput';
import { inputClass } from './ui';

const DateCalendar = lazy(() => import('./DateCalendar'));

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max'> {
  /** Used to name the calendar button and dialog; the input keeps its external label. */
  label: string;
  /** A valid ISO date, an empty value, or an unfinished draft. Never discard invalid edits. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  hasError?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, Props>(function DateInput({
  label, value, onChange, onBlur, onKeyDown, min, max, hasError = false,
  disabled, readOnly, className, id: providedId,
  'aria-describedby': describedBy, 'aria-invalid': ariaInvalid, ...props
}, forwardedRef) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-date-error`;
  const dialogId = `${id}-calendar`;
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const error = dateInputError(value, { min, max });
  const showError = touched && !!error && !hasError;
  const unavailable = disabled || readOnly;
  if (open && unavailable) setOpen(false);

  const changeOpen = (next: boolean) => {
    if (next && unavailable) return;
    if (next) {
      // Keep the portal inside the parent dialog's focus scope, outside its scrolling body.
      setPortalRoot(wrapperRef.current?.closest<HTMLElement>('[data-modal-panel]') ?? null);
    }
    setOpen(next);
  };
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: changeOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    // On small screens the calendar may overlap its input to fit in the viewport.
    // Do not lock its height to the space measured while the lazy fallback is visible.
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8, crossAxis: true })],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context, { enabled: !unavailable }),
    useDismiss(context, { escapeKey: false }),
    useRole(context, { role: 'dialog' }),
  ]);
  const mergedTriggerRef = useMergeRefs([triggerRef, refs.setReference]);
  const closeAndRestore = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="min-w-0">
      <div ref={refs.setPositionReference} className="relative">
        <input
          {...props}
          ref={forwardedRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          value={formatDateInput(value)}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={ariaInvalid || hasError || showError || undefined}
          aria-describedby={[describedBy, showError ? errorId : undefined].filter(Boolean).join(' ') || undefined}
          onChange={(event) => {
            let text = event.target.value;
            // The numeric keyboard has no slash: insert separators as day/month are completed.
            if (/^\d{3,8}$/.test(text) || /^\d{2}\/\d{3,6}$/.test(text)) {
              const digits = text.replaceAll('/', '');
              text = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
            }
            onChange(normalizeDateInput(text));
          }}
          onBlur={(event) => { setTouched(true); onBlur?.(event); }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented && open && event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              closeAndRestore();
            } else if (!event.defaultPrevented && event.altKey && event.key === 'ArrowDown') {
              event.preventDefault();
              changeOpen(true);
            }
          }}
          className={`${className ?? inputClass(hasError || showError)} pr-12`}
        />
        <button
          {...getReferenceProps()}
          ref={mergedTriggerRef}
          type="button"
          disabled={unavailable}
          aria-label={`Abrir calendario: ${label}`}
          aria-haspopup="dialog"
          aria-controls={open ? dialogId : undefined}
          aria-expanded={open}
          onKeyDown={(event) => {
            if (open && event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              closeAndRestore();
            }
          }}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-text-2 transition hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          </svg>
        </button>
      </div>
      {showError && <p id={errorId} role="alert" className="mt-1.5 text-[12.5px] text-danger-fg">{error}</p>}
      {open && (
        <FloatingPortal root={portalRoot ?? undefined}>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1} returnFocus={triggerRef}>
            <div
              {...getFloatingProps()}
              // Floating UI exposes a callback ref here; this does not read ref.current.
              // eslint-disable-next-line react-hooks/refs
              ref={refs.setFloating}
              id={dialogId}
              aria-label={`Calendario: ${label}`}
              style={floatingStyles}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  closeAndRestore();
                }
              }}
              className="ofx-scroll z-[120] max-h-[calc(100dvh-16px)] w-[352px] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-xl border border-border-strong bg-surface p-3 text-text shadow-lg outline-none"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="min-w-0 text-[13px] font-bold">{label}</span>
                <button type="button" onClick={closeAndRestore} aria-label="Cerrar calendario" className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-text-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]">
                  <svg aria-hidden="true" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 6 12 12M6 18 18 6" /></svg>
                </button>
              </div>
              <Suspense fallback={<p role="status" className="p-4 text-[13px] text-text-2">Cargando calendario…</p>}>
                <DateCalendar
                  value={value}
                  min={min}
                  max={max}
                  onSelect={(next) => { onChange(next); setTouched(false); closeAndRestore(); }}
                />
              </Suspense>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
});
