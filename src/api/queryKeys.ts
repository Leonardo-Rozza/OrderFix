import type { EstadoReparacion } from '../types';
import type { ListParams } from './pagination';

export interface ReparacionesQueryParams extends ListParams {
  estado?: EstadoReparacion;
}

/** Valores estables que identifican una sesión paginada del Kanban. */
export interface ReparacionesBoardQueryParams {
  q: string;
  size: number;
  sort: string;
}

/** Parámetros estables de una búsqueda de opciones; `page` vive en pageParam. */
export interface OptionSearchParams {
  q: string;
  size: number;
  sort?: string;
}

export interface CajaQueryRange {
  desde?: string;
  hasta?: string;
}

/**
 * Fuente única de query keys.
 *
 * Las tuplas conservan deliberadamente la forma histórica para que migrar un
 * consumidor no cree una segunda caché ni descarte datos que ya estaban fresh.
 */
export const queryKeys = {
  perfil: {
    all: ['perfil'] as const,
  },
  suscripcion: {
    all: ['suscripcion'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  clientes: {
    all: ['clientes'] as const,
    list: (params: ListParams) => ['clientes', params] as const,
    options: ['clientes', 'options'] as const,
    optionSearch: (params: OptionSearchParams) => ['clientes', 'options', params] as const,
    details: ['cliente'] as const,
    detail: (id: number | undefined) => ['cliente', id] as const,
  },
  equipos: {
    all: ['equipos'] as const,
    list: (params: ListParams) => ['equipos', params] as const,
    options: ['equipos', 'options'] as const,
    optionSearch: (params: OptionSearchParams) => ['equipos', 'options', params] as const,
    byCliente: (clienteId: number | undefined) => ['equipos', 'cliente', clienteId] as const,
    details: ['equipo'] as const,
    detail: (id: number | undefined) => ['equipo', id] as const,
  },
  reparaciones: {
    all: ['reparaciones'] as const,
    list: (params: ReparacionesQueryParams) => ['reparaciones', params] as const,
    boards: ['reparaciones', 'board'] as const,
    boardState: (estado: EstadoReparacion) => ['reparaciones', 'board', estado] as const,
    board: (estado: EstadoReparacion, params: ReparacionesBoardQueryParams) =>
      ['reparaciones', 'board', estado, params] as const,
    options: ['reparaciones', 'options'] as const,
    optionSearch: (params: OptionSearchParams) => ['reparaciones', 'options', params] as const,
    byEquipo: (equipoId: number | undefined) => ['reparaciones', 'equipo', equipoId] as const,
    details: ['reparacion'] as const,
    detail: (id: number | undefined) => ['reparacion', id] as const,
  },
  repuestos: {
    all: ['repuestos'] as const,
    list: (params: ListParams) => ['repuestos', params] as const,
    details: ['repuesto'] as const,
    detail: (id: number | undefined) => ['repuesto', id] as const,
    byReparacion: (reparacionId: number | undefined) =>
      ['repuestos', 'reparacion', reparacionId] as const,
  },
  presupuestos: {
    all: ['presupuestos'] as const,
    byReparacion: (reparacionId: number | undefined) => ['presupuestos', reparacionId] as const,
  },
  cobros: {
    all: ['cobros'] as const,
    byReparacion: (reparacionId: number | undefined) => ['cobros', reparacionId] as const,
  },
  datosCobro: {
    all: ['datos-cobro'] as const,
    detail: ['datos-cobro', 'configuracion'] as const,
    qrAll: ['datos-cobro', 'qr'] as const,
    qr: (version: string | null | undefined) => ['datos-cobro', 'qr', version ?? null] as const,
  },
  caja: {
    all: ['caja'] as const,
    range: (rango: CajaQueryRange) =>
      ['caja', rango.desde ?? null, rango.hasta ?? null] as const,
  },
  recibos: {
    all: ['recibo'] as const,
    byReparacion: (reparacionId: number | undefined) => ['recibo', reparacionId] as const,
  },
  seguimiento: {
    all: ['seguimiento'] as const,
    byCodigo: (codigo: string | undefined) => ['seguimiento', codigo] as const,
  },
  inventario: {
    all: ['inventario'] as const,
    list: (params: ListParams) => ['inventario', params] as const,
    options: ['inventario', 'options'] as const,
    optionSearch: (params: OptionSearchParams) => ['inventario', 'options', params] as const,
  },
  usuarios: {
    all: ['usuarios'] as const,
  },
} as const;
