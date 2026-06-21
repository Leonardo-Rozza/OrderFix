interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

/** Selector de ordenamiento (sort=campo,dir) reutilizable en los listados. */
export const SortSelect = ({ value, onChange, options }: Props) => (
  <label className="flex items-center gap-2 text-[12.5px] text-text-3">
    <span className="hidden sm:inline">Ordenar</span>
    <select
      value={value ?? options[0]?.value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-lg border border-border-strong bg-surface px-2.5 py-2 text-[13px] font-semibold text-text outline-none transition focus:border-primary focus:ring-[3px] focus:ring-[var(--ring)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);
