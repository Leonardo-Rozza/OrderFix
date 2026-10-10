import type { Suscripcion } from '../types';

/** Date display and scheduling only; this never determines access. */
export const paidAccessDeadline = (subscription: Suscripcion): number | null => {
  const value = subscription.accesoProHasta;
  if (typeof value !== 'string') return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts) return null;
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  if (month < 1 || month > 12 || day < 1
    || day > new Date(Date.UTC(year, month, 0)).getUTCDate()
    || hour > 23 || minute > 59 || second > 59) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
};
export const paidAccessLabel = (subscription: Suscripcion): string | null => {
  const instant = paidAccessDeadline(subscription);
  return instant === null ? null : `${new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(instant)} UTC`;
};
export const cancellationMessage = (subscription: Suscripcion): string => {
  const expiry = paidAccessLabel(subscription);
  return subscription.plan === 'PRO' && expiry
    ? `Se cancelará la renovación. Las funciones PRO permanecerán disponibles hasta ${expiry}. ¿Deseas continuar?`
    : 'Se cancelará la renovación. El acceso PRO se conservará hasta finalizar el período pagado que confirme el servicio. ¿Deseas continuar?';
};
