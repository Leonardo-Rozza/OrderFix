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
}

export interface ReparacionEnriquecida extends Reparacion {
  equipo?: EquipoEnriquecido;
}

const byId = <T extends { id: number }>(items: T[] | undefined) =>
  new Map((items ?? []).map((item) => [item.id, item]));

/** Equipos con su cliente embebido. */
export const useEquiposEnriquecidos = () => {
  const equipos = useEquiposQuery();
  const clientes = useClientesQuery();

  const data = useMemo<EquipoEnriquecido[]>(() => {
    const clienteMap = byId(clientes.data);
    return (equipos.data ?? []).map((e) => ({ ...e, cliente: clienteMap.get(e.clienteId) }));
  }, [equipos.data, clientes.data]);

  return { data, isLoading: equipos.isLoading || clientes.isLoading };
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
