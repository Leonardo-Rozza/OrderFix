import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatosCobro } from '../types';
import { renderWithProviders } from '../test/renderWithProviders';
import { API, server } from '../test/server';

vi.mock('../utils/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/toast')>();
  return { ...actual, showError: vi.fn(), showSuccess: vi.fn() };
});

import { showError, showSuccess } from '../utils/toast';
import { DatosCobroFormModal } from './DatosCobroFormModal';

const base: DatosCobro = {
  alias: 'taller.viejo',
  titular: 'Taller Viejo',
  entidad: 'Banco',
  mostrarEnResumen: true,
  qrDisponible: false,
  qrVersion: null,
};

describe('DatosCobroFormModal', () => {
  beforeEach(() => {
    vi.mocked(showError).mockClear();
    vi.mocked(showSuccess).mockClear();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('normaliza blancos a null, respeta máximos y envía el recurso completo', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let body: unknown;
    server.use(
      http.put(`${API}/taller/datos-cobro`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          ...base,
          alias: 'nuevo.alias',
          titular: null,
          entidad: 'Mercado Pago',
          mostrarEnResumen: false,
        });
      }),
    );

    renderWithProviders(<DatosCobroFormModal isOpen onClose={onClose} datos={base} />);

    const alias = screen.getByLabelText('Alias');
    expect(alias).toHaveFocus();
    expect(alias).toHaveAttribute('maxlength', '120');
    expect(screen.getByLabelText('Titular')).toHaveAttribute('maxlength', '160');
    await user.clear(alias);
    await user.type(alias, '  nuevo.alias  ');
    await user.clear(screen.getByLabelText('Titular'));
    await user.type(screen.getByLabelText('Titular'), '   ');
    await user.clear(screen.getByLabelText('Entidad o billetera'));
    await user.type(screen.getByLabelText('Entidad o billetera'), '  Mercado Pago  ');
    await user.click(screen.getByLabelText(/Mostrar estos datos/));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(body).toEqual({
      alias: 'nuevo.alias',
      titular: null,
      entidad: 'Mercado Pago',
      mostrarEnResumen: false,
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(showSuccess).toHaveBeenCalledWith('Datos para cobrar guardados');
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });

  it('si metadatos guardan y QR falla, conserva sólo el QR pendiente y no reenvía metadatos', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let metadataRequests = 0;
    let qrRequests = 0;
    server.use(
      http.put(`${API}/taller/datos-cobro`, async ({ request }) => {
        metadataRequests += 1;
        const payload = await request.json() as object;
        return HttpResponse.json({ ...base, ...payload });
      }),
      http.put(`${API}/taller/datos-cobro/qr`, () => {
        qrRequests += 1;
        if (qrRequests === 1) {
          return HttpResponse.json({
            status: 413,
            code: 'ARCHIVO_DEMASIADO_GRAN',
            message: 'Archivo demasiado grande',
          }, { status: 413 });
        }
        return HttpResponse.json({ ...base, alias: 'alias.confirmado', qrDisponible: true, qrVersion: 'sha-2' });
      }),
    );
    const { container } = renderWithProviders(
      <DatosCobroFormModal isOpen onClose={onClose} datos={base} />,
    );

    await user.clear(screen.getByLabelText('Alias'));
    await user.type(screen.getByLabelText('Alias'), 'alias.confirmado');
    const file = new File(['qr'], 'qr-pendiente.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('1 MiB');
    expect(screen.getByText('Datos guardados.')).toBeVisible();
    expect(screen.getByText(/qr-pendiente\.png/)).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
    expect(metadataRequests).toBe(1);
    expect(qrRequests).toBe(1);
    expect(showError).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByText(/qr-pendiente\.png/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(metadataRequests).toBe(1);
    expect(qrRequests).toBe(2);
  });

  it('si QR guarda y metadatos fallan, conserva los campos y no vuelve a subir el QR', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let metadataRequests = 0;
    let qrRequests = 0;
    server.use(
      http.put(`${API}/taller/datos-cobro`, async ({ request }) => {
        metadataRequests += 1;
        const payload = await request.json() as object;
        if (metadataRequests === 1) {
          return HttpResponse.json({ message: 'No pudimos guardar los datos.' }, { status: 500 });
        }
        return HttpResponse.json({ ...base, ...payload, qrDisponible: true, qrVersion: 'sha-2' });
      }),
      http.put(`${API}/taller/datos-cobro/qr`, () => {
        qrRequests += 1;
        return HttpResponse.json({ ...base, qrDisponible: true, qrVersion: 'sha-2' });
      }),
    );
    const { container } = renderWithProviders(
      <DatosCobroFormModal isOpen onClose={onClose} datos={base} />,
    );

    await user.clear(screen.getByLabelText('Titular'));
    await user.type(screen.getByLabelText('Titular'), 'Titular pendiente');
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['qr'], 'qr-ok.png', { type: 'image/png' })] },
    });
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar los datos.');
    expect(screen.getByText('QR guardado.')).toBeVisible();
    expect(screen.getByLabelText('Titular')).toHaveValue('Titular pendiente');
    expect(screen.queryByText(/qr-ok\.png/)).not.toBeInTheDocument();
    expect(metadataRequests).toBe(1);
    expect(qrRequests).toBe(1);
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(metadataRequests).toBe(2);
    expect(qrRequests).toBe(1);
  });

  it('mantiene copy explícito, foco y controles táctiles del modal', () => {
    renderWithProviders(<DatosCobroFormModal isOpen onClose={vi.fn()} datos={base} />);

    expect(screen.getByText(/no consulta saldos.*no confirma/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Seleccionar QR' })).toHaveClass('min-h-11');
  });

  it('elimina el QR existente sin reenviar metadatos', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let deletes = 0;
    let metadataRequests = 0;
    const existing: DatosCobro = { ...base, qrDisponible: true, qrVersion: 'sha-old' };
    server.use(
      http.get(`${API}/taller/datos-cobro/qr`, () => new HttpResponse(
        new Blob(['png'], { type: 'image/png' }),
        { headers: { 'Content-Type': 'image/png' } },
      )),
      http.put(`${API}/taller/datos-cobro`, () => {
        metadataRequests += 1;
        return HttpResponse.json(existing);
      }),
      http.delete(`${API}/taller/datos-cobro/qr`, () => {
        deletes += 1;
        return HttpResponse.json({ ...existing, qrDisponible: false, qrVersion: null });
      }),
    );
    renderWithProviders(<DatosCobroFormModal isOpen onClose={onClose} datos={existing} />);

    await user.click(await screen.findByRole('button', { name: 'Eliminar QR' }));
    expect(screen.getByText('El QR se eliminará al guardar.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(deletes).toBe(1);
    expect(metadataRequests).toBe(0);
    expect(showSuccess).toHaveBeenCalledWith('QR de cobro eliminado');
  });

  it('mantiene el archivo para reintentar QR_COBRO_INVALIDO y no duplica el error en toast', async () => {
    const user = userEvent.setup();
    server.use(
      http.put(`${API}/taller/datos-cobro/qr`, () => HttpResponse.json({
        status: 400,
        code: 'QR_COBRO_INVALIDO',
        message: 'La imagen no contiene un QR válido.',
      }, { status: 400 })),
    );
    const { container } = renderWithProviders(
      <DatosCobroFormModal isOpen onClose={vi.fn()} datos={base} />,
    );
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['qr'], 'qr-raster.png', { type: 'image/png' })] },
    });

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La imagen no contiene un QR válido.');
    expect(screen.getByText(/qr-raster\.png/)).toBeVisible();
    expect(showError).not.toHaveBeenCalled();
  });
});
