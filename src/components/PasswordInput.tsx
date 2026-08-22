import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { inputClass } from './ui';

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean;
  containerClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { hasError = false, className, containerClassName = '', disabled, id, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';

  return (
    <div className={`relative min-w-0 ${containerClassName}`}>
      <input
        {...props}
        ref={ref}
        id={id}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={`${className ?? inputClass(hasError)} pr-12`}
      />
      <button
        type="button"
        aria-label={label}
        aria-pressed={visible}
        aria-controls={id}
        title={label}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 grid min-h-11 w-11 touch-manipulation place-items-center rounded-r-lg text-text-3 transition hover:text-text focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 3 18 18" />
            <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
            <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 5 9.5 8a8.2 8.2 0 0 1-2 3.7" />
            <path d="M6.6 6.7C4.1 8.3 2.5 10.6 2.5 12c0 3 4 8 9.5 8a10 10 0 0 0 4.1-.9" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 12c0-3 4-8 9.5-8s9.5 5 9.5 8-4 8-9.5 8-9.5-5-9.5-8Z" />
            <circle cx="12" cy="12" r="2.75" />
          </svg>
        )}
      </button>
    </div>
  );
});
