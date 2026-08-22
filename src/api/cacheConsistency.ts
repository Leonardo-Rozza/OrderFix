import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { Cliente, Equipo, Reparacion, Suscripcion } from '../types';
import { queryKeys } from './queryKeys';

export type ClienteChange =
  | { type: 'created' | 'updated'; cliente: Cliente }
  | { type: 'deleted'; clienteId: number };

export type EquipoChange =
  | { type: 'created' | 'updated'; equipo: Equipo }
  | { type: 'deleted'; equipoId: number };

export interface ReparacionChangedEvent {
  reparacionId: number;
  reparacion?: Reparacion;
  consumo?: boolean;
  equipoChanged?: boolean;
}

export interface PresupuestoChangedEvent {
  reparacionId: number;
  codigoSeguimiento?: string;
}

const invalidateKeys = async (queryClient: QueryClient, keys: readonly QueryKey[]) => {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
};

const removeExactKeys = async (queryClient: QueryClient, keys: readonly QueryKey[]) => {
  await Promise.all(
    keys.map((queryKey) => queryClient.cancelQueries({ queryKey, exact: true })),
  );
  keys.forEach((queryKey) => queryClient.removeQueries({ queryKey, exact: true }));
};

/** Reconciliación de las copias que contienen nombre/contacto del cliente. */
export const reconcileClienteChanged = async (
  queryClient: QueryClient,
  change: ClienteChange,
): Promise<void> => {
  if (change.type === 'updated') {
    queryClient.setQueryData(queryKeys.clientes.detail(change.cliente.id), change.cliente);
  } else if (change.type === 'deleted') {
    await removeExactKeys(queryClient, [queryKeys.clientes.detail(change.clienteId)]);
  }

  const keys: QueryKey[] = [queryKeys.clientes.all];
  if (change.type === 'updated') {
    keys.push(
      queryKeys.equipos.all,
      queryKeys.equipos.details,
      queryKeys.reparaciones.all,
      queryKeys.reparaciones.details,
      queryKeys.dashboard.all,
      queryKeys.recibos.all,
      queryKeys.seguimiento.all,
    );
  }

  await invalidateKeys(queryClient, keys);
};

/** Reconciliación de equipos y de los equiposCount que viven en clientes. */
export const reconcileEquipoChanged = async (
  queryClient: QueryClient,
  change: EquipoChange,
): Promise<void> => {
  if (change.type === 'updated') {
    queryClient.setQueryData(queryKeys.equipos.detail(change.equipo.id), change.equipo);
  } else if (change.type === 'deleted') {
    await removeExactKeys(queryClient, [queryKeys.equipos.detail(change.equipoId)]);
  }

  const keys: QueryKey[] = [
    queryKeys.equipos.all,
    queryKeys.clientes.all,
    queryKeys.clientes.details,
    queryKeys.dashboard.all,
  ];

  if (change.type === 'updated') {
    keys.push(
      queryKeys.reparaciones.all,
      queryKeys.reparaciones.details,
      queryKeys.repuestos.all,
      queryKeys.repuestos.details,
      queryKeys.recibos.all,
      queryKeys.seguimiento.all,
    );
  }

  await invalidateKeys(queryClient, keys);
};

/** Reconciliación común de altas, ediciones y transiciones confirmadas. */
export const reconcileReparacionChanged = async (
  queryClient: QueryClient,
  event: ReparacionChangedEvent,
): Promise<void> => {
  const keys: QueryKey[] = [
    queryKeys.reparaciones.all,
    queryKeys.dashboard.all,
    queryKeys.clientes.all,
    queryKeys.clientes.details,
    queryKeys.equipos.all,
    queryKeys.equipos.details,
    queryKeys.cobros.byReparacion(event.reparacionId),
    queryKeys.recibos.byReparacion(event.reparacionId),
    queryKeys.seguimiento.all,
  ];

  if (event.reparacion) {
    queryClient.setQueryData(
      queryKeys.reparaciones.detail(event.reparacionId),
      event.reparacion,
    );
  } else {
    keys.push(queryKeys.reparaciones.detail(event.reparacionId));
  }

  if (event.consumo) keys.push(queryKeys.suscripcion.all);
  if (event.equipoChanged) {
    keys.push(queryKeys.repuestos.all, queryKeys.repuestos.details);
  }

  await invalidateKeys(queryClient, keys);
};

/**
 * Debe invocarse exclusivamente después del 204 del backend: primero purga el
 * recurso inexistente y sus hijos exactos; después refresca padres/agregados.
 */
export const reconcileReparacionDeleted = async (
  queryClient: QueryClient,
  reparacionId: number,
): Promise<void> => {
  await removeExactKeys(queryClient, [
    queryKeys.reparaciones.detail(reparacionId),
    queryKeys.repuestos.byReparacion(reparacionId),
    queryKeys.presupuestos.byReparacion(reparacionId),
    queryKeys.cobros.byReparacion(reparacionId),
    queryKeys.recibos.byReparacion(reparacionId),
  ]);

  await invalidateKeys(queryClient, [
    queryKeys.reparaciones.all,
    queryKeys.dashboard.all,
    queryKeys.clientes.all,
    queryKeys.clientes.details,
    queryKeys.equipos.all,
    queryKeys.equipos.details,
    queryKeys.repuestos.all,
    queryKeys.repuestos.details,
    queryKeys.seguimiento.all,
  ]);
};

export const reconcilePresupuestoChanged = async (
  queryClient: QueryClient,
  event: PresupuestoChangedEvent,
): Promise<void> => {
  await invalidateKeys(queryClient, [
    queryKeys.presupuestos.byReparacion(event.reparacionId),
    queryKeys.reparaciones.detail(event.reparacionId),
    queryKeys.reparaciones.all,
    queryKeys.dashboard.all,
    queryKeys.recibos.byReparacion(event.reparacionId),
    event.codigoSeguimiento
      ? queryKeys.seguimiento.byCodigo(event.codigoSeguimiento)
      : queryKeys.seguimiento.all,
  ]);
};

export const reconcileCobroChanged = async (
  queryClient: QueryClient,
  reparacionId: number,
): Promise<void> => {
  await invalidateKeys(queryClient, [
    queryKeys.cobros.byReparacion(reparacionId),
    queryKeys.caja.all,
    queryKeys.recibos.byReparacion(reparacionId),
    queryKeys.reparaciones.detail(reparacionId),
    queryKeys.reparaciones.all,
    queryKeys.dashboard.all,
  ]);
};

/** Conserva la respuesta FREE y elimina datos que ya no deben reaparecer fresh. */
export const reconcileSuscripcionDegraded = async (
  queryClient: QueryClient,
  suscripcion: Suscripcion,
): Promise<void> => {
  const restrictedRoots = [
    queryKeys.inventario.all,
    queryKeys.caja.all,
    queryKeys.cobros.all,
    queryKeys.recibos.all,
  ] as const;

  await Promise.all([
    queryClient.cancelQueries({ queryKey: queryKeys.suscripcion.all, exact: true }),
    ...restrictedRoots.map((queryKey) => queryClient.cancelQueries({ queryKey })),
  ]);

  queryClient.setQueryData(queryKeys.suscripcion.all, suscripcion);
  restrictedRoots.forEach((queryKey) => queryClient.removeQueries({ queryKey }));

  await invalidateKeys(queryClient, [queryKeys.dashboard.all]);
};
