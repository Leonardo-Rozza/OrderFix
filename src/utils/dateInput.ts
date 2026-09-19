import { isIsoDate } from '../lib/urlSearchParams';

export interface DateInputLimits {
  min?: string;
  max?: string;
}

const isCalendarDate = (value: string) => isIsoDate(value) && !value.startsWith('0000-');

/** Una fecha de calendario local, sin interpretar el valor ISO como un instante UTC. */
export const parseCalendarDate = (value: string): Date | undefined => {
  if (!isCalendarDate(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  // El mediodía evita los cambios de horario que ocurren a medianoche.
  date.setHours(12, 0, 0, 0);
  // El constructor numérico convierte los años 0–99 en 1900–1999.
  date.setFullYear(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
};

/** Serializa el día local elegido; un Date inválido o fuera del rango no produce valor. */
export const formatCalendarDate = (date: Date): string => {
  const year = date.getFullYear();
  if (!Number.isInteger(year) || year < 1 || year > 9999) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(year).padStart(4, '0')}-${month}-${day}`;
};

/** Conserva el texto incompleto o inválido para que la persona pueda corregirlo. */
export const formatDateInput = (value: string): string => {
  if (!isCalendarDate(value)) return value;
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

/** Sólo convierte una fecha completa y real; nunca completa ni corrige un borrador. */
export const normalizeDateInput = (text: string): string => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return text;
  const value = `${match[3]}-${match[2]}-${match[1]}`;
  return isCalendarDate(value) ? value : text;
};

/** Valida el valor canónico del control; el vacío queda a cargo de `required`. */
export const dateInputError = (value: string, limits: DateInputLimits = {}): string | undefined => {
  if (value === '') return undefined;
  if (!isCalendarDate(value)) return 'Ingresá una fecha válida en dd/mm/aaaa.';
  // YYYY-MM-DD permite comparar días sin conversiones de zona horaria.
  if (limits.min && isCalendarDate(limits.min) && value < limits.min) {
    return `Ingresá una fecha igual o posterior al ${formatDateInput(limits.min)}.`;
  }
  if (limits.max && isCalendarDate(limits.max) && value > limits.max) {
    return `Ingresá una fecha igual o anterior al ${formatDateInput(limits.max)}.`;
  }
  return undefined;
};
