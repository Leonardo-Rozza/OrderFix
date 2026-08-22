import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { renderWithProviders } from '../test/renderWithProviders';
import { RepuestoFormModal } from './RepuestoFormModal';
import type { Repuesto } from '../types';

// Al crear, el modal consulta el plan; el inventario se pide recién al abrir su selector.
beforeEach(() => {
  server.use(
    http.get(`${API}/suscripcion`, () =>
      HttpResponse.json({
        plan: 'PRO',
        estado: 'ACTIVA',
        reparacionesEsteMes: 0,
        limiteReparacionesMes: null,
        funciones: { inventario: true, cobros: true, empleadosMultiples: true },
      })
    ),
    http.get(`${API}/inventario`, () => HttpResponse.json({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } }))
  );
});

const renderUI = renderWithProviders;

describe('RepuestoFormModal', () => {
  it('crea un repuesto asociado a la reparación bloqueada (oculta el selector)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/repuestos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 3, ...body }, { status: 201 });
      })
    );

    renderUI(<RepuestoFormModal isOpen onClose={onClose} editing={null} lockedReparacionId={7} />);

    // El selector de reparación no debe mostrarse cuando viene bloqueada
    expect(screen.queryByLabelText(/reparación asociada/i)).not.toBeInTheDocument();

    const submit = await screen.findByRole('button', { name: /crear repuesto/i });
    expect(submit).toHaveAttribute('form', 'repuesto-form');
    await user.type(screen.getByLabelText(/^nombre/i), '  Módulo pantalla  ');
    await user.type(screen.getByLabelText(/precio/i), '8000');
    await user.click(submit);

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ nombre: 'Módulo pantalla', precio: 8000, reparacionId: 7 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByRole('dialog', { name: /¿descartar los cambios\?/i })).not.toBeInTheDocument();
  });

  it('valida que el precio sea requerido', async () => {
    const user = userEvent.setup();
    renderUI(<RepuestoFormModal isOpen onClose={vi.fn()} editing={null} lockedReparacionId={1} />);
    await user.type(screen.getByLabelText(/^nombre/i), 'X');
    await user.click(await screen.findByRole('button', { name: /crear repuesto/i }));
    expect(await screen.findByText(/el precio es requerido/i)).toBeInTheDocument();
  });

  it('no acepta un nombre compuesto sólo por espacios', async () => {
    const user = userEvent.setup();
    renderUI(<RepuestoFormModal isOpen onClose={vi.fn()} editing={null} lockedReparacionId={1} />);
    await user.type(screen.getByLabelText(/^nombre/i), '   ');
    await user.type(screen.getByLabelText(/precio/i), '100');
    await user.click(await screen.findByRole('button', { name: /crear repuesto/i }));
    expect(await screen.findByText(/el nombre es requerido/i)).toBeInTheDocument();
  });

  it('autocompleta nombre, precio y cantidad desde la metadata del inventario', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get(`${API}/inventario`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('size')).toBe('20');
        expect(params.has('sort')).toBe(false);
        return HttpResponse.json({
          content: [{
            id: 17,
            nombre: 'Módulo OLED',
            descripcion: null,
            sku: 'OLED-IP15',
            precio: 12500,
            costo: 7000,
            stock: 3,
            stockMinimo: 1,
            activo: true,
            stockBajo: false,
          }],
          page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
        });
      }),
      http.post(`${API}/repuestos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 4, ...body }, { status: 201 });
      }),
    );

    renderUI(<RepuestoFormModal isOpen onClose={vi.fn()} editing={null} lockedReparacionId={7} />);

    const selector = await screen.findByRole('button', { name: /artículo del inventario/i });
    await user.click(selector);
    await user.click(await screen.findByRole('option', { name: /módulo oled/i }));

    expect(screen.getByLabelText(/^nombre/i)).toHaveValue('Módulo OLED');
    expect(screen.getByLabelText(/precio/i)).toHaveValue('12.500');
    expect(screen.getByLabelText(/cantidad/i)).toHaveValue(1);

    await user.click(screen.getByRole('button', { name: /crear repuesto/i }));
    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      nombre: 'Módulo OLED',
      precio: 12500,
      articuloId: 17,
      cantidad: 1,
      reparacionId: 7,
    });
  });

  it('permite carga manual aunque fallen inventario y reparaciones opcionales', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get(`${API}/inventario`, () => new HttpResponse(null, { status: 500 })),
      http.get(`${API}/reparaciones`, () => new HttpResponse(null, { status: 500 })),
      http.post(`${API}/repuestos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 5, ...body }, { status: 201 });
      }),
    );

    renderUI(<RepuestoFormModal isOpen onClose={vi.fn()} editing={null} />);

    await user.click(await screen.findByRole('button', { name: /artículo del inventario/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/continuar a mano/i);
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /reparación asociada/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/dejar el repuesto sin asociar/i);
    await user.keyboard('{Escape}');

    const submit = screen.getByRole('button', { name: /crear repuesto/i });
    expect(submit).toBeEnabled();
    await user.type(screen.getByLabelText(/^nombre/i), 'Cable flex');
    await user.type(screen.getByLabelText(/precio/i), '3500');
    await user.click(submit);

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ nombre: 'Cable flex', precio: 3500 });
    expect(body).not.toHaveProperty('articuloId');
    expect(body).not.toHaveProperty('reparacionId');
  });

  it('salta una página de órdenes cerradas y permite asociar una orden abierta', async () => {
    const user = userEvent.setup();
    const requestedPages: number[] = [];
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get(`${API}/reparaciones`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        const requestedPage = Number(params.get('page'));
        requestedPages.push(requestedPage);
        expect(params.get('size')).toBe('20');
        expect(params.get('sort')).toBe('id,desc');
        const common = {
          equipoId: 3,
          descripcionProblema: 'No enciende',
          precioEstimado: null,
          precioFinal: null,
          fechaIngreso: null,
          fechaEstimadaEntrega: null,
          fechaEntrega: null,
          equipoMarca: 'Apple',
          equipoModelo: 'iPhone 13',
          clienteNombre: 'Ana',
          clienteApellido: 'Pérez',
        };
        return HttpResponse.json({
          content: requestedPage === 0
            ? [{ ...common, id: 51, numeroOrden: 'ORD-0051', estado: 'ENTREGADO' }]
            : [{ ...common, id: 52, numeroOrden: 'ORD-0052', estado: 'EN_PROCESO' }],
          page: { size: 20, number: requestedPage, totalElements: 2, totalPages: 2 },
        });
      }),
      http.post(`${API}/repuestos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 6, ...body }, { status: 201 });
      }),
    );

    renderUI(<RepuestoFormModal isOpen onClose={vi.fn()} editing={null} />);

    await user.click(screen.getByRole('button', { name: /reparación asociada/i }));
    const abierta = await screen.findByRole('option', { name: /ORD-0052/i });
    expect(screen.queryByRole('option', { name: /ORD-0051/i })).not.toBeInTheDocument();
    await user.click(abierta);

    await user.type(screen.getByLabelText(/^nombre/i), 'Flex de carga');
    await user.type(screen.getByLabelText(/precio/i), '4200');
    await user.click(screen.getByRole('button', { name: /crear repuesto/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(requestedPages).toEqual([0, 1]);
    expect(body).toMatchObject({ reparacionId: 52 });
  });

  it('conserva una asociación histórica cerrada sin consultar el detalle sensible', async () => {
    const user = userEvent.setup();
    const editing: Repuesto = {
      id: 8,
      nombre: 'Pantalla',
      descripcion: null,
      precio: 9000,
      reparacionId: 42,
      reparacionEquipo: 'Samsung A52',
    };
    let listRequests = 0;
    let detailRequests = 0;
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get(`${API}/reparaciones`, () => {
        listRequests += 1;
        return HttpResponse.json({
          content: [{
            id: 42,
            equipoId: 3,
            descripcionProblema: 'Pantalla rota',
            estado: 'ENTREGADO',
            precioEstimado: null,
            precioFinal: null,
            fechaIngreso: null,
            fechaEstimadaEntrega: null,
            fechaEntrega: null,
            equipoMarca: 'Samsung',
            equipoModelo: 'A52',
          }],
          page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
        });
      }),
      http.get(`${API}/reparaciones/:id`, () => {
        detailRequests += 1;
        return new HttpResponse(null, { status: 500 });
      }),
      http.put(`${API}/repuestos/8`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 8, ...body });
      }),
    );

    renderUI(<RepuestoFormModal isOpen onClose={vi.fn()} editing={editing} />);

    const selector = screen.getByRole('button', { name: /reparación asociada/i });
    expect(selector).toHaveTextContent('Orden #42');
    expect(selector).toHaveTextContent('Samsung A52');
    expect(listRequests).toBe(0);

    await user.click(selector);
    expect(await screen.findByText(/no hay órdenes abiertas entre las cargadas/i)).toBeVisible();
    expect(listRequests).toBe(1);
    expect(detailRequests).toBe(0);
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ reparacionId: 42 });
    expect(detailRequests).toBe(0);
  });
});
