import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { Cliente, DatosCobro, Equipo, Reparacion, Suscripcion } from '../types';
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
      queryKeys.resumenes.all,
      queryKeys.seguimiento.all,
      queryKeys.repairEmail.all,
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
      queryKeys.resumenes.all,
      queryKeys.seguimiento.all,
      queryKeys.repairEmail.all,
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
    queryKeys.repairEmail.byReparacion(event.reparacionId),
    queryKeys.resumenes.byReparacion(event.reparacionId),
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
  await queryClient.cancelQueries({ queryKey: queryKeys.repairEmail.byReparacion(reparacionId) });
  queryClient.removeQueries({ queryKey: queryKeys.repairEmail.byReparacion(reparacionId) });
  await removeExactKeys(queryClient, [
    queryKeys.reparaciones.detail(reparacionId),
    queryKeys.repuestos.byReparacion(reparacionId),
    queryKeys.presupuestos.byReparacion(reparacionId),
    queryKeys.cobros.byReparacion(reparacionId),
    queryKeys.resumenes.byReparacion(reparacionId),
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
    queryKeys.resumenes.byReparacion(event.reparacionId),
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
    queryKeys.resumenes.byReparacion(reparacionId),
    queryKeys.reparaciones.detail(reparacionId),
    queryKeys.reparaciones.all,
    queryKeys.dashboard.all,
  ]);
};

/**
 * Publica la configuración confirmada por el backend y descarta cualquier blob
 * anterior: la versión SHA forma parte de la key, pero el endpoint siempre lee
 * el QR vigente del tenant.
 */
export const reconcileDatosCobroChanged = async (
  queryClient: QueryClient,
  datosCobro: DatosCobro,
): Promise<void> => {
  await queryClient.cancelQueries({ queryKey: queryKeys.datosCobro.qrAll });
  queryClient.removeQueries({ queryKey: queryKeys.datosCobro.qrAll });
  queryClient.setQueryData(queryKeys.datosCobro.detail, datosCobro);
  await invalidateKeys(queryClient, [queryKeys.resumenes.all]);
};

/** Purge only effective nontrial FREE data; never cancel the subscription read itself. */
export const purgeRestrictedSubscriptionData = async (
  queryClient: QueryClient,
  suscripcion: Suscripcion,
  isCurrent: () => boolean = () => true,
): Promise<void> => {
  if (suscripcion.plan !== 'FREE' || suscripcion.estado === 'TRIAL' || !isCurrent()) return;
  const restrictedRoots = [
    queryKeys.inventario.all, queryKeys.caja.all, queryKeys.cobros.all,
    queryKeys.datosCobro.all, queryKeys.resumenes.all,
  ] as const;
  await Promise.all(restrictedRoots.map(queryKey => queryClient.cancelQueries({ queryKey })));
  if (!isCurrent()) return;
  restrictedRoots.forEach(queryKey => queryClient.removeQueries({ queryKey }));
  await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all, refetchType: 'none' });
};

/** Publish a confirmed mutation response after fencing older reads. */
export const reconcileSuscripcionDegraded = async (
  queryClient: QueryClient,
  suscripcion: Suscripcion,
  isCurrent: () => boolean = () => true,
): Promise<void> => {
  await queryClient.cancelQueries({ queryKey: queryKeys.suscripcion.all, exact: true });
  if (!isCurrent()) return;
  await purgeRestrictedSubscriptionData(queryClient, suscripcion, isCurrent);
  if (isCurrent()) queryClient.setQueryData(queryKeys.suscripcion.all, suscripcion);
};
