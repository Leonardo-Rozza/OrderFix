import type { OfertaPro, Suscripcion } from '../types';

/** La ausencia de oferta en un backend anterior no habilita contratación. */
export const getOfertaPro = (suscripcion: Suscripcion | undefined): OfertaPro | null => {
  const oferta = suscripcion?.ofertaPro;
  if (!oferta || typeof oferta !== 'object'
    || typeof oferta.precioMensual !== 'number'
    || !Number.isFinite(oferta.precioMensual) || oferta.precioMensual <= 0
    || typeof oferta.moneda !== 'string' || !/^[A-Z]{3}$/.test(oferta.moneda)
    || typeof oferta.contratacionDisponible !== 'boolean') {
    return null;
  }
  return {
    precioMensual: oferta.precioMensual,
    moneda: oferta.moneda,
    contratacionDisponible: oferta.contratacionDisponible,
  };
};
