import type { Reparacion } from '../types';

/** Etiqueta del equipo de una reparación (campos denormalizados del backend). */
export const equipoLabel = (r: Reparacion): string => {
  const label = `${r.equipoMarca ?? ''} ${r.equipoModelo ?? ''}`.trim();
  return label || `Equipo #${r.equipoId}`;
};

/** Etiqueta del cliente de una reparación. */
export const clienteLabel = (r: Reparacion): string => {
  const label = `${r.clienteNombre ?? ''} ${r.clienteApellido ?? ''}`.trim();
  return label || 'Sin cliente';
};
