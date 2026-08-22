import { forwardRef, useCallback, useLayoutEffect, useRef, type InputHTMLAttributes } from 'react';
import { inputClass } from './ui';

const fmt = new Intl.NumberFormat('es-AR');

// Tope de 8 dígitos ($99.999.999): de sobra para una reparación y es el máximo
// del DECIMAL(10,2) del backend — con 9 dígitos desborda y devuelve un 409
// engañoso ("Ya existe un registro con esos datos").
const MAX_DIGITOS = 8;

/** "40.000" | "$ 40000,–" | basura → 40000; vacío → ''. Solo enteros (pesos). */
const parse = (value: string): number | '' => {
  const digits = value.replace(/\D/g, '').slice(0, MAX_DIGITOS);
  return digits ? Number(digits) : '';
};

const displayValue = (value: number | '' | undefined) =>
  value === '' || value === undefined || value === null || Number.isNaN(value) ? '' : fmt.format(value);

/** Devuelve la posición posterior al n-ésimo dígito dentro del valor formateado. */
const caretAfterDigits = (display: string, digitCount: number) => {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < display.length; index += 1) {
    if (/\d/.test(display[index])) seen += 1;
    if (seen === digitCount) return index + 1;
  }
  return display.length;
};

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'inputMode' | 'onChange' | 'type' | 'value'
>;

interface MoneyInputProps extends NativeInputProps {
  /** Número crudo para el form; '' cuando está vacío (compatible con los esquemas Zod). */
  value: number | '' | undefined;
  onChange: (value: number | '') => void;
  hasError?: boolean;
  className?: string;
}

/**
 * Input de montos en pesos: muestra el separador de miles mientras se escribe
 * (40000 → 40.000) y entrega el number crudo al form.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput({
  value,
  onChange,
  hasError = false,
  placeholder = '0',
  disabled,
  className = '',
  'aria-invalid': ariaInvalid,
  ...inputProps
}, forwardedRef) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestedCaretRef = useRef<number | null>(null);
  const display = displayValue(value);
  const setInputRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const restoreCaret = () => {
    const input = inputRef.current;
    const requestedCaret = requestedCaretRef.current;
    if (!input || requestedCaret === null || document.activeElement !== input) return;
    const nextCaret = caretAfterDigits(input.value, requestedCaret);
    input.setSelectionRange(nextCaret, nextCaret);
    requestedCaretRef.current = null;
  };

  // El formateo agrega puntos; se conserva la posición según la cantidad de dígitos
  // a la izquierda para que editar en el medio no salte siempre al final.
  useLayoutEffect(restoreCaret, [display]);

  return (
    <div className="relative min-w-0">
      <span
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-3"
        aria-hidden="true"
      >
        $
      </span>
      <input
        {...inputProps}
        ref={setInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          const selectionStart = event.currentTarget.selectionStart ?? raw.length;
          requestedCaretRef.current = Math.min(
            raw.slice(0, selectionStart).replace(/\D/g, '').length,
            MAX_DIGITOS,
          );
          const parsed = parse(raw);
          onChange(parsed);

          // Si el valor numérico no cambió (p. ej. se borró un separador), React
          // puede no renderizar de nuevo. Restauramos igualmente el caret en el frame.
          window.requestAnimationFrame(restoreCaret);
        }}
        aria-invalid={hasError ? true : ariaInvalid}
        className={`${inputClass(hasError)} pl-8 ${className}`}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
});
