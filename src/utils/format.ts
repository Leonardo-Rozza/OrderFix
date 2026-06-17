/** Formatea un monto en pesos argentinos sin decimales: 48000 -> "$48.000". */
export const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
};

/** Fecha legible: "16 jun 2026". Acepta ISO o YYYY-MM-DD. */
export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Iniciales para avatares: ("Pedro","Gomez") -> "PG". */
export const iniciales = (nombre?: string | null, apellido?: string | null): string => {
  const a = nombre?.trim()?.[0] ?? '';
  const b = apellido?.trim()?.[0] ?? '';
  return (a + b).toUpperCase() || '—';
};

/**
 * Arma un link de WhatsApp (wa.me) con mensaje pre-armado.
 * Deja solo dígitos del teléfono; el usuario debe cargarlo con código de país.
 */
export const whatsappLink = (telefono: string | null | undefined, mensaje: string): string => {
  const num = (telefono ?? '').replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
};
