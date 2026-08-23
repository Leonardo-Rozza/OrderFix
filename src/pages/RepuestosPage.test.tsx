import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/renderWithProviders';
import { server, API } from '../test/server';

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../components/RepuestoFormModal', () => ({
  RepuestoFormModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="repuesto-form-mock" /> : null
  ),
}));

import { RepuestosPage } from './RepuestosPage';

const repuesto = {
  id: 3,
  nombre: 'Módulo pantalla',
  descripcion: 'OLED',
  precio: 8000,
  reparacionId: null,
};

const pagedRepuestos = (page: number, totalPages = 4) => ({
  content: [repuesto],
  page: {
    size: 20,
    number: page,
    totalElements: totalPages * 20,
    totalPages,
  },
});

describe('RepuestosPage — estado navegable', () => {
  it('hidrata q y page desde un deep link y los envía al backend', async () => {
    const requests: Array<{ q: string | null; page: string | null; size: string | null }> = [];

    server.use(
      http.get(`${API}/repuestos`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push({
          q: params.get('q'),
          page: params.get('page'),
          size: params.get('size'),
        });
        return HttpResponse.json(pagedRepuestos(Number(params.get('page'))));
      }),
    );

    renderWithProviders(<RepuestosPage />, {
      initialEntries: ['/repuestos?q=%20pantalla%20&page=2'],
    });

    expect(screen.getByRole('searchbox', { name: /buscar repuestos/i })).toHaveValue(' pantalla ');
    await waitFor(() => expect(requests).toContainEqual({ q: 'pantalla', page: '2', size: '20' }));
  });

  it('conserva la búsqueda al avanzar de página', async () => {
    const user = userEvent.setup();
    const requests: Array<{ q: string | null; page: string | null }> = [];

    server.use(
      http.get(`${API}/repuestos`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push({ q: params.get('q'), page: params.get('page') });
        return HttpResponse.json(pagedRepuestos(Number(params.get('page'))));
      }),
    );

    const { router } = renderWithProviders(<RepuestosPage />, {
      initialEntries: ['/repuestos'],
    });
    await screen.findByRole('button', { name: 'Editar' });

    await user.type(screen.getByRole('searchbox', { name: /buscar repuestos/i }), 'pantalla');
    await waitFor(() => expect(requests).toContainEqual({ q: 'pantalla', page: '0' }), { timeout: 1_000 });

    const nextButton = screen.getByRole('button', { name: 'Siguiente' });
    await waitFor(() => expect(nextButton).toBeEnabled());
    await user.click(nextButton);

    await waitFor(() => expect(requests).toContainEqual({ q: 'pantalla', page: '1' }));
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('pantalla');
    expect(new URLSearchParams(router.state.location.search).get('page')).toBe('1');
  });

  it('canonicaliza valores inválidos antes de consultar al backend', async () => {
    const requests: Array<{ q: string | null; page: string | null }> = [];

    server.use(
      http.get(`${API}/repuestos`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push({ q: params.get('q'), page: params.get('page') });
        return HttpResponse.json(pagedRepuestos(Number(params.get('page')), 1));
      }),
    );

    const { router } = renderWithProviders(<RepuestosPage />, {
      initialEntries: ['/repuestos?q=%20%20&page=-2&page=7'],
    });

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    expect(requests).toEqual(requests.map(() => ({ q: null, page: '0' })));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('corrige una página huérfana con REPLACE', async () => {
    const requestedPages: number[] = [];

    server.use(
      http.get(`${API}/repuestos`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        requestedPages.push(page);
        return HttpResponse.json(pagedRepuestos(page, 3));
      }),
    );

    const { router } = renderWithProviders(<RepuestosPage />, {
      initialEntries: ['/antes', '/repuestos?page=8'],
      initialIndex: 1,
    });

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    await waitFor(() => expect(requestedPages).toEqual(expect.arrayContaining([8, 2])));
    expect(router.state.historyAction).toBe('REPLACE');

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/antes');
  });

  it('abre el formulario sin precargar el catálogo de reparaciones', async () => {
    const user = userEvent.setup();
    let optionRequests = 0;

    server.use(
      http.get(`${API}/repuestos`, () => HttpResponse.json(pagedRepuestos(0, 1))),
      http.get(`${API}/reparaciones`, ({ request }) => {
        optionRequests += 1;
        expect(new URL(request.url).searchParams.get('size')).toBe('20');
        return HttpResponse.json({
          content: [],
          page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
        });
      }),
    );

    renderWithProviders(<RepuestosPage />);
    expect(optionRequests).toBe(0);
    expect(screen.getByRole('searchbox', { name: /buscar repuestos/i })).toHaveClass('min-h-11', 'text-base');
    expect(await screen.findByRole('button', { name: 'Editar' })).toHaveClass('h-11', 'w-11');

    await user.click(screen.getByRole('button', { name: /nuevo repuesto/i }));

    expect(await screen.findByTestId('repuesto-form-mock')).toBeInTheDocument();
    expect(optionRequests).toBe(0);
  });
});
