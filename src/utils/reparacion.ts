import type { Foto, MomentoFoto, Reparacion } from '../types';

/** Etiqueta del equipo de una reparación (campos denormalizados del backend). */
export const equipoLabel = (r: Reparacion): string => {
  const label = `${r.equipoMarca ?? ''} ${r.equipoModelo ?? ''}`.trim();
  return label || `Equipo #${r.equipoId}`;
};

/** Número de orden visible (ORD-2026-0042); fallback #id para datos previos al contrato. */
export const ordenLabel = (r: Pick<Reparacion, 'id' | 'numeroOrden'>): string =>
  r.numeroOrden ?? `#${r.id}`;

/** Etiqueta del cliente de una reparación. */
export const clienteLabel = (r: Reparacion): string => {
  const label = `${r.clienteNombre ?? ''} ${r.clienteApellido ?? ''}`.trim();
  return label || 'Sin cliente';
};

/**
 * URLs de las fotos de un momento dado. Normaliza el formato viejo del
 * contrato (string[] sin momento → se asume INGRESO) para no romper con
 * datos guardados antes de la migración.
 */
export const fotosPorMomento = (fotos: Reparacion['fotos'], momento: MomentoFoto): string[] =>
  (fotos ?? [])
    .map((f): Foto => (typeof f === 'string' ? { url: f, momento: 'INGRESO' } : f))
    .filter((f) => f.momento === momento)
    .map((f) => f.url);
