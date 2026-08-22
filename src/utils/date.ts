/**
 * Devuelve una fecha como YYYY-MM-DD usando el calendario local del navegador.
 *
 * `toISOString()` expresa el instante en UTC y puede adelantar o atrasar el día
 * cerca de medianoche. Los inputs `type="date"` representan una fecha de
 * calendario, por lo que deben construirse con los getters locales.
 */
export const toLocalDateInputValue = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
