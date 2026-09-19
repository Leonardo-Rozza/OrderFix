import { DayPicker, type DropdownProps } from '@daypicker/react';
import { es } from '@daypicker/react/locale';
import { dateInputError, formatCalendarDate, parseCalendarDate } from '../utils/dateInput';
import { Select } from './Select';
import './date-calendar.css';

const CalendarDropdown = ({ options, ...props }: DropdownProps) => (
  <Select {...props} className="h-11 rounded-md border border-border bg-surface-2 px-2 text-[13px] font-semibold text-text outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]">
    {options?.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
  </Select>
);

interface Props {
  value: string;
  min?: string;
  max?: string;
  onSelect: (value: string) => void;
}

const dateLabel = new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' });

export default function DateCalendar({ value, min, max, onSelect }: Props) {
  const selected = parseCalendarDate(value);
  const minimum = min ? parseCalendarDate(min) : undefined;
  const maximum = max ? parseCalendarDate(max) : undefined;
  const today = new Date();
  const todayValue = formatCalendarDate(today);
  const initialMonth = selected ?? (minimum && today < minimum ? minimum : maximum && today > maximum ? maximum : today);
  const startYear = Math.min(1900, initialMonth.getFullYear());
  const endYear = Math.max(today.getFullYear() + 20, initialMonth.getFullYear());
  const startMonth = minimum ?? parseCalendarDate(`${String(startYear).padStart(4, '0')}-01-01`);
  const endMonth = maximum ?? parseCalendarDate(`${String(endYear).padStart(4, '0')}-12-31`);

  return (
    <>
      <DayPicker
        className="ofx-calendar"
        mode="single"
        required
        locale={es}
        weekStartsOn={1}
        autoFocus
        selected={selected}
        defaultMonth={initialMonth}
        onSelect={(date) => { if (date) onSelect(formatCalendarDate(date)); }}
        captionLayout="dropdown"
        navLayout="after"
        startMonth={startMonth}
        endMonth={endMonth}
        disabled={[...(minimum ? [{ before: minimum }] : []), ...(maximum ? [{ after: maximum }] : [])]}
        showOutsideDays
        components={{ Dropdown: CalendarDropdown }}
        labels={{
          labelMonthDropdown: () => 'Mes',
          labelYearDropdown: () => 'Año',
          labelPrevious: () => 'Mes anterior',
          labelNext: () => 'Mes siguiente',
          labelNav: () => 'Navegación del calendario',
          labelDayButton: (date, modifiers) => `${dateLabel.format(date)}${modifiers.today ? ', hoy' : ''}${modifiers.selected ? ', seleccionado' : ''}`,
        }}
      />
      <div className="mt-2 flex justify-between gap-2 border-t border-border pt-2">
        <button type="button" onClick={() => onSelect('')} className="min-h-11 rounded-md px-3 text-[13px] font-semibold text-text-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]">Limpiar fecha</button>
        <button type="button" onClick={() => onSelect(todayValue)} disabled={!!dateInputError(todayValue, { min, max })} className="min-h-11 rounded-md px-3 text-[13px] font-bold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-40">Hoy</button>
      </div>
    </>
  );
}
