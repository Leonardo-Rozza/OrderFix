import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { server, API } from '../test/server';
import { renderWithProviders } from '../test/renderWithProviders';

vi.mock('../utils/toast', async (orig) => {
  const actual = await orig<typeof import('../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

import { ReparacionFormModal } from './ReparacionFormModal';
import { showError, showSuccess } from '../utils/toast';
import type { Equipo, Reparacion, ReparacionCredenciales } from '../types';

const renderUI = (ui: ReactElement) => renderWithProviders(ui);

beforeEach(() => {
  vi.mocked(showError).mockClear();
  vi.mocked(showSuccess).mockClear();
});

const completarMinimos = async (
  user: ReturnType<typeof userEvent.setup>,
  problema = 'Pantalla rota',
) => {
  await user.type(screen.getByLabelText(/^nombre/i), 'Juan');
  await user.type(screen.getByLabelText(/teléfono/i), '1155551234');
  await user.type(screen.getByLabelText(/^marca/i), 'Apple');
  await user.type(screen.getByLabelText(/^modelo/i), 'iPhone 12');
  await user.type(screen.getByLabelText(/problema/i), problema);
};

describe('ReparacionFormModal — alta rápida (modo nuevo)', () => {
  it('crea cliente+equipo+reparación con el endpoint de ingreso rápido', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;
    let equiposRequests = 0;

    server.use(
      http.get(`${API}/equipos`, () => {
        equiposRequests += 1;
        return HttpResponse.json({
          content: [],
          page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
        });
      }),
      http.post(`${API}/reparaciones/ingreso-rapido`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { clienteId: 1, equipoId: 2, clienteNuevo: true, reparacion: { id: 9 } },
          { status: 201 }
        );
      })
    );

    renderUI(<ReparacionFormModal isOpen onClose={onClose} editing={null} />);

    await completarMinimos(user, '  Pantalla rota  ');
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      clienteNombre: 'Juan',
      clienteTelefono: '1155551234',
      equipoMarca: 'Apple',
      equipoModelo: 'iPhone 12',
      descripcionProblema: 'Pantalla rota',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(equiposRequests).toBe(0);
  });

  it('si falla el PUT, conserva la orden creada y el siguiente submit reintenta sólo ese PUT', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreated = vi.fn();
    let postCount = 0;
    let putCount = 0;

    server.use(
      http.post(`${API}/reparaciones/ingreso-rapido`, () => {
        postCount += 1;
        return HttpResponse.json({
          clienteId: 1,
          equipoId: 2,
          clienteNuevo: true,
          reparacion: { id: 9, equipoId: 2 },
        }, { status: 201 });
      }),
      http.put(`${API}/reparaciones/9`, async ({ request }) => {
        putCount += 1;
        if (putCount === 1) {
          return HttpResponse.json({ message: 'Falla temporal' }, { status: 500 });
        }
        return HttpResponse.json({ id: 9, ...(await request.json() as object) });
      }),
    );

    renderUI(
      <ReparacionFormModal
        isOpen
        onClose={onClose}
        editing={null}
        onCreated={onCreated}
      />,
    );

    await completarMinimos(user);
    fireEvent.change(screen.getByLabelText(/entrega estimada/i), {
      target: { value: '2026-08-20' },
    });
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(putCount).toBe(1));
    expect(postCount).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(showSuccess).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalledWith(expect.stringMatching(/ya fue creada.*no se duplicará/i));
    expect(screen.getByLabelText(/problema/i)).toHaveValue('Pantalla rota');
    expect(screen.getByRole('button', { name: /elegir equipo existente/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /cerrar y completar después/i }));
    const discardDialog = await screen.findByRole('dialog', { name: '¿Descartar los cambios?' });
    expect(discardDialog).toHaveTextContent(/la orden ya existe/i);
    expect(discardDialog).toHaveTextContent(/no se va a eliminar ni duplicar/i);
    expect(discardDialog).toHaveTextContent(/detalles locales que todavía no se guardaron/i);
    expect(discardDialog).not.toHaveTextContent(/pin|patrón|fotos|https?:\/\//i);
    expect(within(discardDialog).getByRole('button', { name: /cerrar y completar después/i })).toBeVisible();
    await user.click(within(discardDialog).getByRole('button', { name: /seguir editando/i }));

    await user.click(screen.getByRole('button', { name: /reintentar detalles/i }));

    await waitFor(() => expect(putCount).toBe(2));
    expect(postCount).toBe(1);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onCreated).toHaveBeenCalledWith(9);
    expect(showSuccess).toHaveBeenCalledTimes(1);
  });

  it('completa con PUT cuando sólo se cambió la fecha de ingreso local', async () => {
    const user = userEvent.setup();
    let putBody: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/reparaciones/ingreso-rapido`, () => HttpResponse.json({
        clienteId: 1,
        equipoId: 2,
        clienteNuevo: true,
        reparacion: { id: 9, equipoId: 2 },
      }, { status: 201 })),
      http.put(`${API}/reparaciones/9`, async ({ request }) => {
        putBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ id: 9, ...putBody });
      }),
    );

    renderUI(<ReparacionFormModal isOpen onClose={vi.fn()} editing={null} />);
    await completarMinimos(user);
    fireEvent.change(screen.getByLabelText(/fecha de ingreso/i), {
      target: { value: '2026-01-15' },
    });
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(putBody).toBeDefined());
    expect(putBody).toMatchObject({ fechaIngreso: '2026-01-15' });
  });

  it('valida los campos mínimos antes de enviar', async () => {
    const user = userEvent.setup();
    let llamado = false;
    server.use(
      http.post(`${API}/reparaciones/ingreso-rapido`, () => {
        llamado = true;
        return HttpResponse.json({}, { status: 201 });
      })
    );

    renderUI(<ReparacionFormModal isOpen onClose={vi.fn()} editing={null} />);
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    expect(await screen.findByText(/nombre requerido/i)).toBeInTheDocument();
    expect(llamado).toBe(false);
  });

  it('protege un cambio de modo y conserva la selección al seguir editando', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderUI(<ReparacionFormModal isOpen onClose={onClose} editing={null} />);

    const modoExistente = screen.getByRole('button', { name: /elegir equipo existente/i });
    await user.click(modoExistente);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /seguir editando/i }));

    expect(modoExistente).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: /descartar cambios/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reabre los detalles y enfoca una garantía inválida antes de enviar', async () => {
    const user = userEvent.setup();
    renderUI(<ReparacionFormModal isOpen onClose={vi.fn()} editing={null} />);
    await completarMinimos(user);

    const summary = screen.getByText('Detalles de ingreso (opcional)', { exact: true });
    await user.click(summary);
    const details = summary.closest('details');
    const garantia = screen.getByLabelText(/garantía \(días\)/i);
    await user.clear(garantia);
    await user.type(garantia, '0');
    await user.click(summary);
    expect(details).not.toHaveAttribute('open');

    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    expect(details).toHaveAttribute('open');
    expect(await screen.findByText('Mín. 1')).toBeVisible();
    await waitFor(() => expect(garantia).toHaveFocus());
  });
});

describe('ReparacionFormModal — equipo existente', () => {
  it('consulta bajo demanda, pagina y crea la reparación contra el equipo elegido', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;
    const requestedPages: number[] = [];

    const equipo: Equipo = {
      id: 5,
      marca: 'Samsung',
      modelo: 'A52',
      imei: '359999',
      color: null,
      descripcion: null,
      clienteId: 1,
      clienteNombre: 'Ana',
      clienteApellido: 'Gómez',
    };

    server.use(
      http.get(`${API}/equipos`, ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page'));
        requestedPages.push(page);
        expect(url.searchParams.get('size')).toBe('20');
        expect(url.searchParams.get('sort')).toBe('id,desc');
        return HttpResponse.json({
          content: page === 1 ? [equipo] : [],
          page: { size: 20, number: page, totalElements: 21, totalPages: 2 },
        });
      }),
      http.post(`${API}/reparaciones`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 10, ...body }, { status: 201 });
      })
    );

    renderUI(<ReparacionFormModal isOpen onClose={onClose} editing={null} />);

    await user.click(screen.getByRole('button', { name: /elegir equipo existente/i }));
    expect(requestedPages).toEqual([]);
    await user.click(screen.getByLabelText(/^equipo/i));
    await user.click(await screen.findByRole('button', { name: /cargar más/i }));
    await user.click(await screen.findByRole('option', { name: /samsung a52/i }));
    await user.type(screen.getByLabelText(/problema/i), 'No enciende');
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(requestedPages).toEqual([0, 1]);
    expect(body).toMatchObject({ equipoId: 5, descripcionProblema: 'No enciende' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

const reparacionEnEdicion: Reparacion = {
  id: 15,
  equipoId: 5,
  equipoMarca: 'Samsung',
  equipoModelo: 'A52',
  descripcionProblema: 'No enciende',
  estado: 'EN_PROCESO',
  precioEstimado: null,
  precioFinal: null,
  fechaIngreso: '2026-08-20',
  fechaEstimadaEntrega: null,
  fechaEntrega: null,
};

const credencialesGuardadas: ReparacionCredenciales = {
  patronDesbloqueo: 'L invertida',
  pinDesbloqueo: '1234',
};

describe('ReparacionFormModal — edición segura de credenciales', () => {
  it('omite PIN/patrón sin cambios para conservarlos en el backend', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    let equiposRequests = 0;
    server.use(
      http.get(`${API}/equipos`, () => {
        equiposRequests += 1;
        return HttpResponse.json({
          content: [],
          page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
        });
      }),
      http.put(`${API}/reparaciones/15`, async ({ request }) => {
        body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ ...reparacionEnEdicion, ...body });
      }),
    );

    renderUI(
      <ReparacionFormModal
        isOpen
        onClose={vi.fn()}
        editing={reparacionEnEdicion}
        credenciales={credencialesGuardadas}
      />,
    );
    const equipo = screen.getByLabelText(/^equipo/i);
    expect(equipo).toBeDisabled();
    expect(equipo).toHaveTextContent('Samsung A52');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).not.toHaveProperty('pinDesbloqueo');
    expect(body).not.toHaveProperty('patronDesbloqueo');
    expect(equiposRequests).toBe(0);
  });

  it('manda string vacío cuando el técnico borra una credencial', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put(`${API}/reparaciones/15`, async ({ request }) => {
        body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ ...reparacionEnEdicion, ...body });
      }),
    );

    renderUI(
      <ReparacionFormModal
        isOpen
        onClose={vi.fn()}
        editing={reparacionEnEdicion}
        credenciales={credencialesGuardadas}
      />,
    );
    await user.click(screen.getByText('Detalles de ingreso (opcional)', { exact: true }));
    await user.clear(screen.getByLabelText(/pin \/ contraseña/i));
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body?.pinDesbloqueo).toBe('');
    expect(body).not.toHaveProperty('patronDesbloqueo');
  });

  it('limpia al entregar y restaura desde el detalle si el backend rechaza el cambio', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onLimpiarCredenciales = vi.fn();
    const onRefetchCredenciales = vi.fn().mockResolvedValue(credencialesGuardadas);
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put(`${API}/reparaciones/15`, async ({ request }) => {
        body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ message: 'Transición rechazada' }, { status: 409 });
      }),
    );

    renderUI(
      <ReparacionFormModal
        isOpen
        onClose={onClose}
        editing={{ ...reparacionEnEdicion, estado: 'COMPLETADO' }}
        credenciales={credencialesGuardadas}
        onLimpiarCredenciales={onLimpiarCredenciales}
        onRefetchCredenciales={onRefetchCredenciales}
      />,
    );
    await user.click(screen.getByText('Detalles de ingreso (opcional)', { exact: true }));
    await user.selectOptions(screen.getByLabelText(/^estado$/i), 'ENTREGADO');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(onLimpiarCredenciales).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onRefetchCredenciales).toHaveBeenCalledTimes(1));
    expect(await screen.findByLabelText(/pin \/ contraseña/i)).toHaveValue('1234');
    expect(screen.getByLabelText(/patrón de desbloqueo/i)).toHaveValue('L invertida');
    expect(body).not.toHaveProperty('pinDesbloqueo');
    expect(body).not.toHaveProperty('patronDesbloqueo');
    expect(onClose).not.toHaveBeenCalled();
  });
});
