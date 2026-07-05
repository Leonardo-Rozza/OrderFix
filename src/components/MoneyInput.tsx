import { inputClass } from './ui';

const fmt = new Intl.NumberFormat('es-AR');

// Tope de 8 dígitos ($99.999.999): de sobra para una reparación y es el máximo
// del DECIMAL(10,2) del backend — con 9 dígitos desborda y devuelve un 409
// engañoso ("Ya existe un registro con esos datos").
const MAX_DIGITOS = 8;

/** "40.000" | "$ 40000,–" | basura → 40000; vacío → ''. Solo enteros (pesos). */
const parse = (s: string): number | '' => {
  const digits = s.replace(/\D/g, '').slice(0, MAX_DIGITOS);
  return digits ? Number(digits) : '';
};

interface MoneyInputProps {
  id?: string;
  /** Número crudo para el form; '' cuando está vacío (compatible con los esquemas Zod). */
  value: number | '' | undefined;
  onChange: (value: number | '') => void;
  hasError?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Input de montos en pesos: muestra el separador de miles mientras se escribe
 * (40000 → 40.000) y entrega el number crudo al form.
 */
export const MoneyInput = ({ id, value, onChange, hasError, placeholder = '0', disabled }: MoneyInputProps) => {
  const display =
    value === '' || value === undefined || value === null || Number.isNaN(value) ? '' : fmt.format(value);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-3">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => onChange(parse(e.target.value))}
        className={`${inputClass(hasError)} pl-8`}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
};
