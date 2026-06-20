import { useMemo } from 'react';
import { useReparacionesQuery } from '../api/queries/reparaciones.queries';
import { useEquiposQuery } from '../api/queries/equipos.queries';
import { useClientesQuery } from '../api/queries/clientes.queries';
import type { Cliente, Equipo, Reparacion } from '../types';

/**
 * El backend devuelve DTOs planos (solo IDs). Estos hooks arman los joins
 * equipo↔cliente y reparación↔equipo en el cliente, cruzando las listas.
 */

export interface EquipoEnriquecido extends Equipo {
  cliente?: Cliente;
  reparacionesCount?: number;
}

export interface ReparacionEnriquecida extends Reparacion {
  equipo?: EquipoEnriquecido;
}

export interface ClienteEnriquecido extends Cliente {
  equipos: Equipo[];
  reparaciones: Reparacion[];
  ultimaVisita?: string;
}

const byId = <T extends { id: number }>(items: T[] | undefined) =>
  new Map((items ?? []).map((item) => [item.id, item]));

/** Equipos con su cliente embebido y la cantidad de reparaciones asociadas. */
export const useEquiposEnriquecidos = () => {
  const equipos = useEquiposQuery();
  const clientes = useClientesQuery();
  const reparaciones = useReparacionesQuery();

  const data = useMemo<EquipoEnriquecido[]>(() => {
    const clienteMap = byId(clientes.data);
    const conteo = new Map<number, number>();
    (reparaciones.data ?? []).forEach((r) => conteo.set(r.equipoId, (conteo.get(r.equipoId) ?? 0) + 1));
    return (equipos.data ?? []).map((e) => ({
      ...e,
      cliente: clienteMap.get(e.clienteId),
      reparacionesCount: conteo.get(e.id) ?? 0,
    }));
  }, [equipos.data, clientes.data, reparaciones.data]);

  return { data, isLoading: equipos.isLoading || clientes.isLoading };
};

/** Clientes con sus equipos, reparaciones y última visita (joins client-side). */
export const useClientesEnriquecidos = () => {
  const clientes = useClientesQuery();
  const equipos = useEquiposQuery();
  const reparaciones = useReparacionesQuery();

  const data = useMemo<ClienteEnriquecido[]>(() => {
    const eqs = equipos.data ?? [];
    const reps = reparaciones.data ?? [];
    return (clientes.data ?? []).map((c) => {
      const cEquipos = eqs.filter((e) => e.clienteId === c.id);
      const ids = new Set(cEquipos.map((e) => e.id));
      const cReps = reps.filter((r) => ids.has(r.equipoId));
      const fechas = cReps.map((r) => r.fechaIngreso).filter((f): f is string => !!f).sort();
      return { ...c, equipos: cEquipos, reparaciones: cReps, ultimaVisita: fechas.at(-1) };
    });
  }, [clientes.data, equipos.data, reparaciones.data]);

  return {
    data,
    isLoading: clientes.isLoading || equipos.isLoading || reparaciones.isLoading,
  };
};

/** Reparaciones con su equipo (y el cliente del equipo) embebidos. */
export const useReparacionesEnriquecidas = () => {
  const reparaciones = useReparacionesQuery();
  const equipos = useEquiposQuery();
  const clientes = useClientesQuery();

  const data = useMemo<ReparacionEnriquecida[]>(() => {
    const equipoMap = byId(equipos.data);
    const clienteMap = byId(clientes.data);
    return (reparaciones.data ?? []).map((r) => {
      const equipo = equipoMap.get(r.equipoId);
      const cliente = equipo ? clienteMap.get(equipo.clienteId) : undefined;
      return { ...r, equipo: equipo ? { ...equipo, cliente } : undefined };
    });
  }, [reparaciones.data, equipos.data, clientes.data]);

  return {
    data,
    isLoading: reparaciones.isLoading || equipos.isLoading || clientes.isLoading,
    isError: reparaciones.isError,
  };
};
