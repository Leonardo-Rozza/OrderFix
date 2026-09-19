import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../axios';
import type { Page } from '../pagination';
import type { Articulo, Cliente, Equipo, Reparacion } from '../../types';
import { clientesOptionsSource } from './clientes.queries';
import { equiposOptionsSource } from './equipos.queries';
import { inventarioOptionsSource } from './inventario.queries';
import { reparacionesOptionsSource } from './reparacion-options.queries';

const page = <T>(
  content: T[],
  number = 0,
  totalPages = 1,
  totalElements = content.length,
): Page<T> => ({
  content,
  page: { size: 20, number, totalElements, totalPages },
});

const mockGet = <T>(data: Page<T>) => vi
  .spyOn(apiClient, 'get')
  .mockResolvedValue({ data } as never);

const cliente: Cliente = {
  id: 7,
  nombre: 'Ada',
  apellido: 'Lovelace',
  telefono: '11 5555-0101',
  email: null,
  direccion: null,
};

const equipo: Equipo = {
  tipo: 'CELULAR',
  id: 11,
  marca: 'Apple',
  modelo: 'iPhone 15',
  imei: '351234',
  color: null,
  descripcion: null,
  clienteId: cliente.id,
  clienteNombre: cliente.nombre,
  clienteApellido: cliente.apellido,
};

const articulo: Articulo = {
  id: 17,
  nombre: 'Módulo OLED',
  descripcion: null,
  sku: 'OLED-IP15',
  precio: 125000,
  costo: null,
  stock: 3,
  stockMinimo: 1,
  activo: true,
  stockBajo: false,
};

const reparacion = (
  id: number,
  estado: Reparacion['estado'],
  overrides: Partial<Reparacion> = {},
): Reparacion => ({
  id,
  equipoId: equipo.id,
  descripcionProblema: 'No enciende',
  estado,
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: null,
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
  numeroOrden: `ORD-2026-${String(id).padStart(4, '0')}`,
  equipoMarca: equipo.marca,
  equipoModelo: equipo.modelo,
  clienteNombre: cliente.nombre,
  clienteApellido: cliente.apellido,
  ...overrides,
});

describe('fuentes remotas de opciones', () => {
  it('clientes usa la key estable y propaga q, página, sort, signal y error inline', async () => {
    const response = page([cliente], 1, 3, 41);
    const get = mockGet(response);
    const controller = new AbortController();

    expect(clientesOptionsSource.queryKey({ query: '  Ada  ', size: 20 })).toEqual([
      'clientes',
      'options',
      { q: 'Ada', size: 20, sort: 'nombre,asc' },
    ]);

    const result = await clientesOptionsSource.loadPage({
      query: '  Ada  ',
      page: 1,
      size: 20,
      signal: controller.signal,
    });

    expect(get).toHaveBeenCalledWith('/clientes', {
      params: { q: 'Ada', page: 1, size: 20, sort: 'nombre,asc' },
      signal: controller.signal,
      errorMode: 'inline',
    });
    expect(result).toEqual({
      options: [{ value: 7, label: 'Ada Lovelace', sublabel: '11 5555-0101' }],
      page: response.page,
    });
  });

  it('equipos solicita página dos y aporta cliente e IMEI como contexto', async () => {
    const response = page([equipo], 1, 2, 21);
    const get = mockGet(response);
    const signal = new AbortController().signal;

    const result = await equiposOptionsSource.loadPage({
      query: ' iphone ',
      page: 1,
      size: 20,
      signal,
    });

    expect(equiposOptionsSource.queryKey({ query: ' iphone ', size: 20 })).toEqual([
      'equipos',
      'options',
      { q: 'iphone', size: 20, sort: 'id,desc' },
    ]);
    expect(get).toHaveBeenCalledWith('/equipos', {
      params: { q: 'iphone', page: 1, size: 20, sort: 'id,desc' },
      signal,
      errorMode: 'inline',
    });
    expect(result.options).toEqual([{
      value: equipo.id,
      label: 'Apple iPhone 15',
      sublabel: 'Celular · Ada Lovelace · Serie / IMEI 351234',
      meta: { tipo: 'CELULAR' },
    }]);
    expect(result.page).toBe(response.page);
  });

  it('inventario no inventa sort y cachea sólo metadata necesaria para autocompletar', async () => {
    const response = page([articulo]);
    const get = mockGet(response);
    const signal = new AbortController().signal;

    const result = await inventarioOptionsSource.loadPage({
      query: ' OLED ',
      page: 0,
      size: 20,
      signal,
    });

    expect(inventarioOptionsSource.queryKey({ query: ' OLED ', size: 20 })).toEqual([
      'inventario',
      'options',
      { q: 'OLED', size: 20 },
    ]);
    expect(get).toHaveBeenCalledWith('/inventario', {
      params: { q: 'OLED', page: 0, size: 20 },
      signal,
      errorMode: 'inline',
    });
    expect(result.options).toHaveLength(1);
    expect(result.options[0]).toMatchObject({
      value: articulo.id,
      label: articulo.nombre,
      sublabel: expect.stringContaining('SKU OLED-IP15'),
      meta: { nombre: articulo.nombre, precio: articulo.precio, stock: articulo.stock },
    });
    expect(result.options[0].meta).not.toHaveProperty('costo');
    expect(result.options[0].meta).not.toHaveProperty('descripcion');
  });

  it('reparaciones usa sólo el listado seguro, excluye cerradas y conserva metadata cruda', async () => {
    const abierta = reparacion(31, 'EN_PROCESO');
    const abiertaConRespuestaLegacy = {
      ...abierta,
      pinDesbloqueo: '1234',
      patronDesbloqueo: 'L invertida',
    } as Reparacion;
    const entregada = reparacion(32, 'ENTREGADO');
    const cancelada = reparacion(33, 'CANCELADO');
    const response = page([entregada, abiertaConRespuestaLegacy, cancelada], 0, 4, 63);
    const get = mockGet(response);
    const signal = new AbortController().signal;

    const result = await reparacionesOptionsSource.loadPage({
      query: ' Ada ',
      page: 0,
      size: 20,
      signal,
    });

    expect(reparacionesOptionsSource.queryKey({ query: ' Ada ', size: 20 })).toEqual([
      'reparaciones',
      'options',
      { q: 'Ada', size: 20, sort: 'id,desc' },
    ]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/reparaciones', {
      params: { q: 'Ada', page: 0, size: 20, sort: 'id,desc' },
      signal,
      errorMode: 'inline',
    });
    expect(result.options).toEqual([{
      value: abierta.id,
      label: 'ORD-2026-0031 · Apple iPhone 15',
      sublabel: 'Ada Lovelace · No enciende · En proceso',
    }]);
    expect(result.page).toBe(response.page);
    expect(result.page.totalElements).toBe(63);
    expect(JSON.stringify(result.options)).not.toContain('1234');
    expect(JSON.stringify(result.options)).not.toContain('L invertida');
    expect(reparacionesOptionsSource.maxAutomaticPages).toBe(1);
  });
});
