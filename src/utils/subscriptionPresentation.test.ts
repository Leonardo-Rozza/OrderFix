import { describe, expect, it } from 'vitest';
import { paidAccessDeadline, paidAccessLabel, cancellationMessage } from './subscriptionPresentation';
import type { Suscripcion } from '../types';
const paid: Suscripcion = {
  plan: 'PRO', estado: 'ACTIVA', fechaInicio: null, fechaFinTrial: null, proximoCobro: null,
  reparacionesEsteMes: 0, limiteReparacionesMes: null,
  funciones: { inventario: true, cobros: true, empleadosMultiples: true },
  accesoProHasta: '2030-11-08T10:45:00-03:00', renovacionCancelada: true,
};
describe('paid access presentation', () => {
  it('presents the exact server instant in UTC rather than the local calendar', () => {
    expect(paidAccessLabel(paid)).toBe('08/11/2030, 13:45:00 UTC');
    expect(paidAccessDeadline(paid)).toBe(Date.parse('2030-11-08T13:45:00Z'));
    expect(cancellationMessage(paid)).toContain('funciones PRO permanecerán disponibles hasta 08/11/2030, 13:45:00 UTC');
  });
  it.each([null, undefined, '', 'invalid', '2030-11-08', '2030-11-08T13:45:00', '2030-02-30T13:45:00Z', '2030-11-08T24:00:00Z'])('does not fabricate a paid date from %s', expiry => {
    const unknown = { ...paid, accesoProHasta: expiry, proximoCobro: '2030-11-08' };
    expect(paidAccessLabel(unknown)).toBeNull();
    expect(cancellationMessage(unknown)).toContain('período pagado que confirme el servicio');
  });
});
