import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { Cliente, Equipo, Reparacion, Suscripcion } from '../types';
import {
  reconcileClienteChanged,
  reconcileCobroChanged,
  reconcileEquipoChanged,
  reconcilePresupuestoChanged,
  reconcileReparacionDeleted,
  reconcileSuscripcionDegraded,
} from './cacheConsistency';
import { queryKeys } from './queryKeys';

const cliente: Cliente = {
  id: 7,
  nombre: 'Ada',
  apellido: 'Lovelace',
  telefono: '111',
  email: 'ada@example.com',
  direccion: null,
  equiposCount: 1,
};

const equipo: Equipo = {
  tipo: 'CELULAR',
  id: 11,
  marca: 'Apple',
  modelo: 'iPhone',
  imei: null,
  color: null,
  descripcion: null,
  clienteId: cliente.id,
  clienteNombre: cliente.nombre,
};

const reparacion: Reparacion = {
  id: 13,
  equipoId: equipo.id,
  descripcionProblema: 'No enciende',
  estado: 'INGRESADO',
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
};

const suscripcionFree: Suscripcion = {
  plan: 'FREE',
  estado: 'ACTIVA',
  fechaInicio: '2026-08-20',
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 2,
  limiteReparacionesMes: 10,
  funciones: {
    inventario: false,
    cobros: false,
    empleadosMultiples: false,
  },
};

const createClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
    mutations: { retry: false },
  },
});

const seed = (client: QueryClient, key: readonly unknown[], data: unknown = { cached: true }) => {
  client.setQueryData(key, data);
};

const isInvalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key)?.isInvalidated;

describe('queryKeys', () => {
  it('conserva las tuplas históricas de todas las queries', () => {
    const params = { page: 0, size: 20, search: 'ada' };

    expect(queryKeys.perfil.all).toEqual(['perfil']);
    expect(queryKeys.suscripcion.all).toEqual(['suscripcion']);
    expect(queryKeys.dashboard.all).toEqual(['dashboard']);
    expect(queryKeys.clientes.list(params)).toEqual(['clientes', params]);
    expect(queryKeys.clientes.options).toEqual(['clientes', 'options']);
    expect(queryKeys.clientes.optionSearch({ q: 'ada', size: 20, sort: 'nombre,asc' })).toEqual([
      'clientes',
      'options',
      { q: 'ada', size: 20, sort: 'nombre,asc' },
    ]);
    expect(queryKeys.clientes.detail(7)).toEqual(['cliente', 7]);
    expect(queryKeys.equipos.list(params)).toEqual(['equipos', params]);
    expect(queryKeys.equipos.options).toEqual(['equipos', 'options']);
    expect(queryKeys.equipos.optionSearch({ q: '', size: 20, sort: 'id,desc' })).toEqual([
      'equipos',
      'options',
      { q: '', size: 20, sort: 'id,desc' },
    ]);
    expect(queryKeys.equipos.byCliente(7)).toEqual(['equipos', 'cliente', 7]);
    expect(queryKeys.equipos.detail(11)).toEqual(['equipo', 11]);
    expect(queryKeys.reparaciones.list({ ...params, estado: 'INGRESADO' })).toEqual([
      'reparaciones',
      { ...params, estado: 'INGRESADO' },
    ]);
    expect(queryKeys.reparaciones.options).toEqual(['reparaciones', 'options']);
    expect(queryKeys.reparaciones.optionSearch({ q: 'iphone', size: 20, sort: 'id,desc' })).toEqual([
      'reparaciones',
      'options',
      { q: 'iphone', size: 20, sort: 'id,desc' },
    ]);
    expect(queryKeys.reparaciones.byEquipo(11)).toEqual(['reparaciones', 'equipo', 11]);
    expect(queryKeys.reparaciones.detail(13)).toEqual(['reparacion', 13]);
    expect(queryKeys.repuestos.list(params)).toEqual(['repuestos', params]);
    expect(queryKeys.repuestos.detail(17)).toEqual(['repuesto', 17]);
    expect(queryKeys.repuestos.byReparacion(13)).toEqual(['repuestos', 'reparacion', 13]);
    expect(queryKeys.presupuestos.byReparacion(13)).toEqual(['presupuestos', 13]);
    expect(queryKeys.cobros.byReparacion(13)).toEqual(['cobros', 13]);
    expect(queryKeys.caja.range({ desde: '2026-08-01' })).toEqual([
      'caja',
      '2026-08-01',
      null,
    ]);
    expect(queryKeys.recibos.byReparacion(13)).toEqual(['recibo', 13]);
    expect(queryKeys.resumenes).toBe(queryKeys.recibos);
    expect(queryKeys.resumenes.byReparacion(13)).toEqual(queryKeys.recibos.byReparacion(13));
    expect(queryKeys.seguimiento.byCodigo('ABC')).toEqual(['seguimiento', 'ABC']);
    expect(queryKeys.inventario.list(params)).toEqual(['inventario', params]);
    expect(queryKeys.inventario.options).toEqual(['inventario', 'options']);
    expect(queryKeys.inventario.optionSearch({ q: 'oled', size: 20 })).toEqual([
      'inventario',
      'options',
      { q: 'oled', size: 20 },
    ]);
    expect(queryKeys.usuarios.all).toEqual(['usuarios']);
  });
});

describe('consistencia de caché', () => {
  it('reemplaza el detalle de cliente y marca stale todas sus copias denormalizadas', async () => {
    const client = createClient();
    const params = { page: 0, size: 20 };
    const actualizado = { ...cliente, nombre: 'Augusta Ada' };
    const affected = [
      queryKeys.clientes.list(params),
      queryKeys.clientes.options,
      queryKeys.clientes.optionSearch({ q: 'ada', size: 20, sort: 'nombre,asc' }),
      queryKeys.equipos.list(params),
      queryKeys.equipos.detail(equipo.id),
      queryKeys.reparaciones.list(params),
      queryKeys.reparaciones.detail(reparacion.id),
      queryKeys.dashboard.all,
      queryKeys.recibos.byReparacion(reparacion.id),
      queryKeys.seguimiento.byCodigo('ABC'),
    ];
    affected.forEach((key) => seed(client, key));
    seed(client, queryKeys.clientes.detail(cliente.id), cliente);
    seed(client, queryKeys.inventario.list(params));

    await reconcileClienteChanged(client, { type: 'updated', cliente: actualizado });

    expect(client.getQueryData(queryKeys.clientes.detail(cliente.id))).toEqual(actualizado);
    expect(isInvalidated(client, queryKeys.clientes.detail(cliente.id))).toBe(false);
    affected.forEach((key) => expect(isInvalidated(client, key)).toBe(true));
    expect(isInvalidated(client, queryKeys.inventario.list(params))).toBe(false);
  });

  it('reconcilia una edición de equipo con clientes, reparaciones y derivados', async () => {
    const client = createClient();
    const params = { page: 0, size: 20 };
    const actualizado = { ...equipo, modelo: 'iPhone 16', clienteId: 9 };
    const affected = [
      queryKeys.equipos.list(params),
      queryKeys.equipos.options,
      queryKeys.equipos.optionSearch({ q: 'iphone', size: 20, sort: 'id,desc' }),
      queryKeys.clientes.list(params),
      queryKeys.clientes.detail(cliente.id),
      queryKeys.reparaciones.list(params),
      queryKeys.reparaciones.detail(reparacion.id),
      queryKeys.repuestos.list(params),
      queryKeys.repuestos.detail(17),
      queryKeys.dashboard.all,
      queryKeys.recibos.byReparacion(reparacion.id),
      queryKeys.seguimiento.byCodigo('ABC'),
    ];
    affected.forEach((key) => seed(client, key));
    seed(client, queryKeys.equipos.detail(equipo.id), equipo);
    seed(client, queryKeys.inventario.list(params));

    await reconcileEquipoChanged(client, { type: 'updated', equipo: actualizado });

    expect(client.getQueryData(queryKeys.equipos.detail(equipo.id))).toEqual(actualizado);
    expect(isInvalidated(client, queryKeys.equipos.detail(equipo.id))).toBe(false);
    affected.forEach((key) => expect(isInvalidated(client, key)).toBe(true));
    expect(isInvalidated(client, queryKeys.inventario.list(params))).toBe(false);
  });

  it('remueve detalle e hijos exactos sólo al reconciliar una reparación eliminada', async () => {
    const client = createClient();
    const params = { page: 0, size: 20 };
    const removed = [
      queryKeys.reparaciones.detail(reparacion.id),
      queryKeys.repuestos.byReparacion(reparacion.id),
      queryKeys.presupuestos.byReparacion(reparacion.id),
      queryKeys.cobros.byReparacion(reparacion.id),
      queryKeys.recibos.byReparacion(reparacion.id),
    ];
    removed.forEach((key) => seed(client, key));
    seed(client, queryKeys.reparaciones.list(params));
    seed(client, queryKeys.reparaciones.optionSearch({ q: 'iphone', size: 20, sort: 'id,desc' }));
    seed(client, queryKeys.dashboard.all);
    seed(client, queryKeys.inventario.list(params));

    await reconcileReparacionDeleted(client, reparacion.id);

    removed.forEach((key) => expect(client.getQueryState(key)).toBeUndefined());
    expect(isInvalidated(client, queryKeys.reparaciones.list(params))).toBe(true);
    expect(isInvalidated(client, queryKeys.reparaciones.optionSearch({ q: 'iphone', size: 20, sort: 'id,desc' }))).toBe(true);
    expect(isInvalidated(client, queryKeys.dashboard.all)).toBe(true);
    expect(isInvalidated(client, queryKeys.inventario.list(params))).toBe(false);
  });

  it('presupuesto y cobro invalidan sólo las dependencias operativas previstas', async () => {
    const presupuestoClient = createClient();
    const presupuestoKeys = [
      queryKeys.presupuestos.byReparacion(reparacion.id),
      queryKeys.reparaciones.detail(reparacion.id),
      queryKeys.reparaciones.all,
      queryKeys.dashboard.all,
      queryKeys.recibos.byReparacion(reparacion.id),
      queryKeys.seguimiento.byCodigo('ABC'),
    ];
    presupuestoKeys.forEach((key) => seed(presupuestoClient, key));

    await reconcilePresupuestoChanged(presupuestoClient, {
      reparacionId: reparacion.id,
      codigoSeguimiento: 'ABC',
    });

    presupuestoKeys.forEach((key) => expect(isInvalidated(presupuestoClient, key)).toBe(true));

    const cobroClient = createClient();
    const cobroKeys = [
      queryKeys.cobros.byReparacion(reparacion.id),
      queryKeys.caja.range({}),
      queryKeys.recibos.byReparacion(reparacion.id),
      queryKeys.reparaciones.detail(reparacion.id),
      queryKeys.reparaciones.all,
      queryKeys.dashboard.all,
    ];
    cobroKeys.forEach((key) => seed(cobroClient, key));

    await reconcileCobroChanged(cobroClient, reparacion.id);

    cobroKeys.forEach((key) => expect(isInvalidated(cobroClient, key)).toBe(true));
  });

  it('al degradar el plan conserva la suscripción nueva y purga caches restringidas', async () => {
    const client = createClient();
    const params = { page: 0, size: 20 };
    seed(client, queryKeys.suscripcion.all, { ...suscripcionFree, plan: 'PRO' });
    seed(client, queryKeys.inventario.list(params));
    seed(client, queryKeys.inventario.optionSearch({ q: 'oled', size: 20 }));
    seed(client, queryKeys.caja.range({}));
    seed(client, queryKeys.cobros.byReparacion(reparacion.id));
    seed(client, queryKeys.recibos.byReparacion(reparacion.id));
    seed(client, queryKeys.dashboard.all);
    seed(client, queryKeys.clientes.list(params));

    await reconcileSuscripcionDegraded(client, suscripcionFree);

    expect(client.getQueryData(queryKeys.suscripcion.all)).toEqual(suscripcionFree);
    expect(isInvalidated(client, queryKeys.suscripcion.all)).toBe(false);
    expect(client.getQueryState(queryKeys.inventario.list(params))).toBeUndefined();
    expect(client.getQueryState(queryKeys.inventario.optionSearch({ q: 'oled', size: 20 }))).toBeUndefined();
    expect(client.getQueryState(queryKeys.caja.range({}))).toBeUndefined();
    expect(client.getQueryState(queryKeys.cobros.byReparacion(reparacion.id))).toBeUndefined();
    expect(client.getQueryState(queryKeys.recibos.byReparacion(reparacion.id))).toBeUndefined();
    expect(isInvalidated(client, queryKeys.dashboard.all)).toBe(true);
    expect(isInvalidated(client, queryKeys.clientes.list(params))).toBe(false);
  });
});
