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

vi.mock('../api/repairPhotos', async (original) => ({
  ...await original<typeof import('../api/repairPhotos')>(),
  getPhotoRequirements: vi.fn(), preparePhotoAttempt: vi.fn(), uploadPhotoAttempt: vi.fn(),
}));
import { getPhotoRequirements, preparePhotoAttempt, uploadPhotoAttempt, type PhotoAttempt, type PhotoRequirements, type PrivatePhoto } from '../api/repairPhotos';

import { ReparacionFormModal } from './ReparacionFormModal';
import { authStore } from '../store/auth.store';
import { showError, showSuccess } from '../utils/toast';
import type { Equipo, Reparacion, ReparacionCredenciales } from '../types';

const renderUI = (ui: ReactElement) => renderWithProviders(ui);

beforeEach(() => {
  vi.mocked(showError).mockClear();
  vi.mocked(showSuccess).mockClear();
});

const adminToken = `header.${btoa(JSON.stringify({
  role: 'ROLE_ADMIN',
  exp: Math.floor(Date.now() / 1000) + 3600,
}))}.firma`;

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
  it('permanece limpio para un ADMIN cuando el técnico y la garantía están vacíos', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.get(`${API}/usuarios`, () => HttpResponse.json([])),
    );
    authStore.getState().login(adminToken, 'admin@ordenfix.test');

    const { unmount } = renderUI(<ReparacionFormModal isOpen onClose={onClose} editing={null} />);
    await screen.findByLabelText('Técnico asignado');
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
    unmount();
    authStore.getState().logout();
  });

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
    fireEvent.change(screen.getByRole('textbox', { name: 'Entrega estimada' }), {
      target: { value: '20/08/2026' },
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Fecha de ingreso' }), {
      target: { value: '15/01/2026' },
    });
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(putBody).toBeDefined());
    expect(putBody).toMatchObject({ fechaIngreso: '2026-01-15' });
  });

  it.each([
    { label: 'Fecha de ingreso', field: 'fechaIngreso', invalid: '31/02/2028' },
    { label: 'Entrega estimada', field: 'fechaEstimadaEntrega', invalid: '15/0' },
  ])('impide crear con $label inválida y envía ISO al corregirla', async ({ label, field, invalid }) => {
    const user = userEvent.setup();
    let postCount = 0;
    let putBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/reparaciones/ingreso-rapido`, () => {
        postCount++;
        return HttpResponse.json({ clienteId: 1, equipoId: 2, clienteNuevo: true, reparacion: { id: 9, equipoId: 2 } }, { status: 201 });
      }),
      http.put(`${API}/reparaciones/9`, async ({ request }) => {
        putBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ id: 9, ...putBody });
      }),
    );
    renderUI(<ReparacionFormModal isOpen onClose={vi.fn()} editing={null} />);
    await completarMinimos(user);
    const input = screen.getByRole('textbox', { name: label });
    fireEvent.change(input, { target: { value: invalid } });
    fireEvent.blur(input);
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(postCount).toBe(0);
    expect(putBody).toBeUndefined();
    expect(input).toHaveValue(invalid);
    fireEvent.change(input, { target: { value: '29/02/2028' } });
    await user.click(screen.getByRole('button', { name: /crear reparación/i }));

    await waitFor(() => expect(putBody).toBeDefined());
    expect(postCount).toBe(1);
    expect(putBody).toMatchObject({ [field]: '2028-02-29' });
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

  it('limpia la confirmación de credenciales y vuelve al baseline al quitar la cuenta', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderUI(<ReparacionFormModal isOpen onClose={onClose} editing={null} />);

    await user.click(screen.getByText('Detalles de ingreso (opcional)', { exact: true }));
    const cuenta = screen.getByLabelText('Cuenta vinculada');
    await user.selectOptions(cuenta, 'ICLOUD');
    await user.click(screen.getByLabelText(/el cliente conoce las credenciales/i));
    expect(screen.getByLabelText(/el cliente conoce las credenciales/i)).toBeChecked();

    await user.selectOptions(cuenta, 'NINGUNA');
    expect(screen.queryByLabelText(/el cliente conoce las credenciales/i)).not.toBeInTheDocument();
    await user.selectOptions(cuenta, 'ICLOUD');
    expect(screen.getByLabelText(/el cliente conoce las credenciales/i)).not.toBeChecked();
    await user.selectOptions(cuenta, 'NINGUNA');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
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

describe('ReparacionFormModal — fechas de calendario', () => {
  it('presenta ISO en formato local y conserva fechas independientes al editar', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(http.put(`${API}/reparaciones/15`, async ({ request }) => {
      body = await request.json() as Record<string, unknown>;
      return HttpResponse.json({ ...reparacionEnEdicion, ...body });
    }));
    renderUI(<ReparacionFormModal isOpen onClose={vi.fn()} editing={reparacionEnEdicion} />);
    const ingreso = screen.getByRole('textbox', { name: 'Fecha de ingreso' });
    const estimada = screen.getByRole('textbox', { name: 'Entrega estimada' });
    expect(ingreso).toHaveValue('20/08/2026');
    expect(estimada).toHaveValue('');
    fireEvent.change(estimada, { target: { value: '18/08/2026' } });
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ fechaIngreso: '2026-08-20', fechaEstimadaEntrega: '2026-08-18' });
  });

  it('mantiene opcionales las fechas vacías sin enviar textos locales', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(http.put(`${API}/reparaciones/15`, async ({ request }) => {
      body = await request.json() as Record<string, unknown>;
      return HttpResponse.json({ ...reparacionEnEdicion, ...body });
    }));
    renderUI(<ReparacionFormModal isOpen onClose={vi.fn()} editing={reparacionEnEdicion} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Fecha de ingreso' }), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).not.toHaveProperty('fechaIngreso');
    expect(body).not.toHaveProperty('fechaEstimadaEntrega');
  });
});

describe('ReparacionFormModal — edición segura de credenciales', () => {
  it('normaliza credenciales conocidas a false cuando la cuenta pasa a NINGUNA', async () => {
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
        editing={{
          ...reparacionEnEdicion,
          tieneCuentaVinculada: 'ICLOUD',
          clienteConoceCredenciales: true,
        }}
      />,
    );

    await user.click(screen.getByText('Detalles de ingreso (opcional)', { exact: true }));
    expect(screen.getByLabelText(/el cliente conoce las credenciales/i)).toBeChecked();
    await user.selectOptions(screen.getByLabelText('Cuenta vinculada'), 'NINGUNA');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      tieneCuentaVinculada: 'NINGUNA',
      clienteConoceCredenciales: false,
    });
  });

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


describe('ReparacionFormModal — fotos sobre una orden confirmada', () => {
  const requirementId = '00000000-0000-4000-8000-000000000001';
  const requirements: PhotoRequirements = {
    locale: 'es-AR', requiredSetRevision: `sha256:${'a'.repeat(64)}`,
    limites: { maxBytes: 8_000_000, mimeTypes: ['image/jpeg', 'image/png'] },
    requisitos: [{ id: requirementId, contexto: 'ATESTACION_FOTOS', tipoActo: 'DECLARACION',
      afirmacion: 'Autorizo las fotografías del cliente', afirmacionSha256: 'b'.repeat(64), requerido: true,
      documentos: [{ id: requirementId, tipo: 'ATESTACION_DATOS_CLIENTE', version: '1', titulo: 'Fotos',
        contenidoMarkdown: 'Condiciones para fotos', sha256: 'c'.repeat(64), vigenteDesde: '2026-09-09T00:00:00Z',
        estado: 'VIGENTE', locale: 'es-AR' }] }],
  };
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:local-photo');
    URL.revokeObjectURL = vi.fn();
    vi.mocked(getPhotoRequirements).mockReset().mockResolvedValue(requirements);
    vi.mocked(preparePhotoAttempt).mockReset();
    vi.mocked(uploadPhotoAttempt).mockReset();
  });

  it.each(['nuevo', 'existente'] as const)('en modo %s un fallo de carga conserva ID y reintenta sólo fotos', async (mode) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreated = vi.fn();
    const selectedFile = new File(['photo'], 'local.jpg', { type: 'image/jpeg' });
    const retainedAttempt: PhotoAttempt = { key: requirementId, file: selectedFile, payload: {
      nombre: 'local.jpg', mimeType: 'image/jpeg', bytes: 5, sha256: 'd'.repeat(64), momento: 'INGRESO',
      requiredSetRevision: requirements.requiredSetRevision, aceptacionesLegales: [],
      atestacion: { tipo: 'AUTORIZACION_DATOS_CLIENTE', alcances: ['FOTOS'], confirmada: true },
    } };
    const savedPhoto: PrivatePhoto = { id: requirementId, momento: 'INGRESO', mimeType: 'image/jpeg',
      bytes: 5, sha256: 'd'.repeat(64), createdAt: '2026-09-09T00:01:00Z' };
    vi.mocked(preparePhotoAttempt).mockResolvedValue(retainedAttempt);
    vi.mocked(uploadPhotoAttempt).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(savedPhoto);
    let creations = 0;
    let updates = 0;
    const bodies: object[] = [];
    server.use(
      http.get(`${API}/equipos`, () => HttpResponse.json({ content: [{ id: 5, marca: 'Samsung', modelo: 'A52', clienteId: 1 }],
        page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } })),
      http.post(`${API}/reparaciones/ingreso-rapido`, async ({ request }) => {
        creations++; bodies.push(await request.json() as object);
        return HttpResponse.json({ clienteId: 1, equipoId: 5, clienteNuevo: true, reparacion: { id: 9, equipoId: 5 } }, { status: 201 });
      }),
      http.post(`${API}/reparaciones`, async ({ request }) => {
        creations++; bodies.push(await request.json() as object);
        return HttpResponse.json({ id: 9, equipoId: 5 }, { status: 201 });
      }),
      http.put(`${API}/reparaciones/9`, () => { updates++; return HttpResponse.json({ id: 9 }); }),
    );
    const { container } = renderUI(<ReparacionFormModal isOpen editing={null} onClose={onClose} onCreated={onCreated} />);
    if (mode === 'nuevo') await completarMinimos(user);
    else {
      await user.click(screen.getByRole('button', { name: /elegir equipo existente/i }));
      await user.click(screen.getByLabelText(/^equipo/i));
      await user.click(await screen.findByRole('option', { name: /Samsung A52/i }));
      await user.type(screen.getByLabelText(/problema/i), 'No carga');
    }
    await user.click(screen.getByText('Detalles de ingreso (opcional)', { exact: true }));
    fireEvent.change(container.querySelector('#fotosIngreso')!, { target: { files: [selectedFile] } });
    expect(getPhotoRequirements).not.toHaveBeenCalled();
    expect(preparePhotoAttempt).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Crear reparación' }));
    await screen.findByRole('heading', { name: 'Fotos de la orden guardada' });
    expect(creations).toBe(1);
    expect(updates).toBe(0);
    expect(bodies[0]).not.toHaveProperty('fotos');
    expect(onClose).not.toHaveBeenCalled();
    expect(getPhotoRequirements).toHaveBeenCalledWith(9, expect.any(AbortSignal));
    expect(uploadPhotoAttempt).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('checkbox', { name: /Autorizo las fotografías/ }));
    await user.click(screen.getByRole('checkbox', { name: /Confirmo que cuento/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar fotos' }));
    await screen.findByText(/No se completó la carga de fotos/);
    expect(creations).toBe(1);
    expect(onCreated).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Reintentar fotos' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onCreated).toHaveBeenCalledWith(9);
    expect(creations).toBe(1);
    expect(updates).toBe(0);
    expect(vi.mocked(uploadPhotoAttempt).mock.calls.map(([id, attempt]) => [id, attempt])).toEqual([[9, retainedAttempt], [9, retainedAttempt]]);
    expect(preparePhotoAttempt).toHaveBeenCalledOnce();
  });

  it('editar una orden con referencias legacy conserva su lectura sin reenviar URLs', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(http.put(`${API}/reparaciones/15`, async ({ request }) => {
      body = await request.json() as Record<string, unknown>;
      return HttpResponse.json({ ...reparacionEnEdicion, ...body });
    }));
    renderUI(<ReparacionFormModal isOpen editing={{ ...reparacionEnEdicion, fotos: [{ url: 'https://legacy.test/a.jpg', momento: 'INGRESO' }] }} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(body).toBeDefined());
    expect(body).not.toHaveProperty('fotos');
    expect(JSON.stringify(body)).not.toContain('legacy.test');
    expect(getPhotoRequirements).not.toHaveBeenCalled();
  });
});
