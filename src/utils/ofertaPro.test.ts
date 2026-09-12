import { describe, expect, it } from 'vitest';
import type { Suscripcion } from '../types';
import { getOfertaPro } from './ofertaPro';

const oferta = { precioMensual: 12345.67, moneda: 'ARS', contratacionDisponible: true };
const suscripcion = (ofertaPro: unknown) => ({ ofertaPro } as Suscripcion);

describe('getOfertaPro', () => {
  it('conserva precio y moneda del servicio sin sustituirlos por una tarifa local', () => {
    expect(getOfertaPro(suscripcion(oferta))).toEqual(oferta);
    const otraMoneda = { ...oferta, precioMensual: 19.99, moneda: 'USD' };
    expect(getOfertaPro(suscripcion(otraMoneda))).toEqual(otraMoneda);
  });

  it('conserva una oferta válida con contratación apagada', () => {
    const apagada = { ...oferta, contratacionDisponible: false };
    expect(getOfertaPro(suscripcion(apagada))).toEqual(apagada);
  });

  it.each([
    undefined, null, {}, 'no es una oferta',
    { ...oferta, precioMensual: 0 },
    { ...oferta, precioMensual: -10 },
    { ...oferta, precioMensual: Number.POSITIVE_INFINITY },
    { ...oferta, precioMensual: '12345.67' },
    { ...oferta, moneda: 'ARS inválido' },
    { ...oferta, moneda: 'ars' },
    { ...oferta, contratacionDisponible: 'true' },
  ])('no habilita contratación con oferta ausente o malformada: %j', (value) => {
    expect(getOfertaPro(suscripcion(value))).toBeNull();
  });

  it('admite la consulta todavía pendiente sin ofrecer contratación', () => {
    expect(getOfertaPro(undefined)).toBeNull();
  });
});
