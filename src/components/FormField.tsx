import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

export interface FormFieldAccessibilityProps {
  errorId: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
  'aria-required'?: true;
}

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode | ((accessibility: FormFieldAccessibilityProps) => ReactNode);
  htmlFor?: string;
  /** Permite compartir un id estable con controles compuestos que gestionan su propio ARIA. */
  errorId?: string;
}

const mergeIds = (...values: unknown[]) => {
  const ids = values
    .filter((value): value is string => typeof value === 'string')
    .flatMap((value) => value.trim().split(/\s+/))
    .filter(Boolean);
  return ids.length > 0 ? [...new Set(ids)].join(' ') : undefined;
};

export const FormField = ({ label, error, required, children, htmlFor, errorId: providedErrorId }: FormFieldProps) => {
  const generatedErrorId = useId();
  const errorId = providedErrorId ?? generatedErrorId;
  const accessibility: FormFieldAccessibilityProps = {
    errorId,
    ...(error ? { 'aria-invalid': true as const, 'aria-describedby': errorId } : {}),
    ...(required ? { 'aria-required': true as const } : {}),
  };

  let field: ReactNode;
  if (typeof children === 'function') {
    field = children(accessibility);
  } else if (isValidElement(children)) {
    const element = children as ReactElement<Record<string, unknown>>;
    const describedBy = mergeIds(element.props['aria-describedby'], error ? errorId : undefined);
    field = cloneElement(element, {
      ...(error ? { 'aria-invalid': true } : {}),
      ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      ...(required ? { 'aria-required': true } : {}),
    });
  } else {
    field = children;
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-bold text-text">
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {field}
      {error ? (
        <p id={errorId} role="alert" className="text-[12.5px] text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
};
