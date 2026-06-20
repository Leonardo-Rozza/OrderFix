import type { MetodoPago } from '../types';

export const METODOS: { key: MetodoPago; label: string }[] = [
  { key: 'EFECTIVO', label: 'Efectivo' },
  { key: 'TRANSFERENCIA', label: 'Transferencia' },
  { key: 'TARJETA', label: 'Tarjeta' },
  { key: 'MERCADOPAGO', label: 'MercadoPago' },
  { key: 'OTRO', label: 'Otro' },
];

export const metodoLabel = (m: MetodoPago): string => METODOS.find((x) => x.key === m)?.label ?? m;
