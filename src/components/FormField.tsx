import { cloneElement, isValidElement, useId, type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export const FormField = ({ label, error, required, children, htmlFor }: FormFieldProps) => {
  const errorId = useId();

  // Vincula el error al control (aria-invalid + aria-describedby) sin tocar cada form.
  const field =
    error && isValidElement(children)
      ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
          'aria-invalid': true,
          'aria-describedby': errorId,
        })
      : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-bold text-text">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {field}
      {error && (
        <p id={errorId} role="alert" className="text-[12.5px] text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
};
