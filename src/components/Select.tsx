import { forwardRef, type SelectHTMLAttributes } from 'react';
import { inputClass } from './ui';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  /** El espacio exterior va en el contenedor para mantener la flecha centrada. */
  containerClassName?: string;
}

/** Conserva el select nativo, su teclado y su ref de formulario; sólo unifica la flecha. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { hasError = false, className, containerClassName = '', children, ...props },
  ref,
) {
  return (
    <span className={`relative block min-w-0 ${containerClassName}`}>
      <select
        {...props}
        ref={ref}
        className={`${className ?? inputClass(hasError)} peer block w-full min-w-0 appearance-none pr-11`}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-2 peer-disabled:opacity-50"
      >
        <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
});
