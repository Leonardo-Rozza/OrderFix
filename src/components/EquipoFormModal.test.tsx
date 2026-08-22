import { beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server, API } from '../test/server';
import { renderWithProviders } from '../test/renderWithProviders';
import { EquipoFormModal } from './EquipoFormModal';
import type { Cliente } from '../types';

const clientes: Cliente[] = [
  { id: 1, nombre: 'Ana', apellido: 'Gómez', telefono: '111', email: null, direccion: null },
  { id: 2, nombre: 'Bruno', apellido: 'Ruiz', telefono: '222', email: null, direccion: null },
];

const clientesPage = (content = clientes, page = 0, totalPages = 1) => ({
  content,
  page: { size: 20, number: page, totalElements: content.length, totalPages },
});

const renderUI = renderWithProviders;

describe('EquipoFormModal', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API}/clientes`, () => HttpResponse.json(clientesPage())),
    );
  });

  it('crea un equipo asociado al cliente seleccionado', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/equipos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 9, ...body }, { status: 201 });
      })
    );

    renderUI(<EquipoFormModal isOpen onClose={onClose} editing={null} />);

    await user.type(screen.getByLabelText(/^marca/i), 'Samsung');
    await user.type(screen.getByLabelText(/^modelo/i), 'A52');
    await user.click(screen.getByLabelText(/cliente/i));
    await user.click(await screen.findByRole('option', { name: /ana/i }));
    await user.click(screen.getByRole('button', { name: /crear equipo/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ marca: 'Samsung', modelo: 'A52', clienteId: 1 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByRole('dialog', { name: /¿descartar los cambios\?/i })).not.toBeInTheDocument();
  });

  it('preselecciona el cliente conocido sin consultar hasta abrir el selector', async () => {
    const user = userEvent.setup();
    let requests = 0;
    server.use(
      http.get(`${API}/clientes`, () => {
        requests += 1;
        return HttpResponse.json(clientesPage());
      }),
    );

    renderUI(<EquipoFormModal isOpen onClose={vi.fn()} editing={null} defaultCliente={clientes[0]} />);
    await waitFor(() => expect(screen.getByLabelText(/cliente/i)).toHaveTextContent(/ana/i));
    expect(requests).toBe(0);

    await user.click(screen.getByLabelText(/cliente/i));
    expect(await screen.findByRole('option', { name: /bruno/i })).toBeVisible();
    expect(requests).toBe(1);
  });

  it('mantiene el error dentro del selector y permite reintentar', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get(`${API}/clientes`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ message: 'Temporal' }, { status: 500 })
          : HttpResponse.json(clientesPage());
      }),
    );
    renderUI(<EquipoFormModal isOpen onClose={vi.fn()} editing={null} />);

    expect(screen.getByRole('button', { name: /seleccioná un cliente/i })).toBeDisabled();
    await user.click(screen.getByLabelText(/cliente/i));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos cargar los clientes/i);
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByRole('option', { name: /ana/i })).toBeVisible();
    expect(attempts).toBe(2);
  });

  it('permite reasignar el cliente al editar y envía la nueva relación', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    const editing = {
      id: 9,
      marca: 'Samsung',
      modelo: 'A52',
      imei: null,
      color: null,
      descripcion: null,
      clienteId: 1,
      clienteNombre: 'Ana',
      clienteApellido: 'Gómez',
    };
    server.use(
      http.put(`${API}/equipos/9`, async ({ request }) => {
        body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ ...editing, ...body });
      }),
    );

    renderUI(<EquipoFormModal isOpen onClose={vi.fn()} editing={editing} />);
    expect(screen.getByLabelText(/cliente/i)).toHaveTextContent(/ana gómez/i);

    await user.click(screen.getByLabelText(/cliente/i));
    await user.click(await screen.findByRole('option', { name: /bruno ruiz/i }));
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({ clienteId: 2, marca: 'Samsung', modelo: 'A52' });
  });
});
