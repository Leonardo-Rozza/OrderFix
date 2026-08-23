import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../test/renderWithProviders';
import { server, API } from '../test/server';

const { useFuncionesMock } = vi.hoisted(() => ({
  useFuncionesMock: vi.fn(),
}));

vi.mock('../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../api/queries/suscripcion.queries', () => ({
  useFunciones: useFuncionesMock,
}));

vi.mock('../components/ArticuloFormModal', () => ({
  ArticuloFormModal: () => null,
}));

import { InventarioPage } from './InventarioPage';

const articulo = {
  id: 9,
  nombre: 'Pantalla OLED',
  descripcion: 'Módulo completo',
  sku: 'OLED-001',
  precio: 8500,
  costo: 6000,
  stock: 6,
  stockMinimo: 2,
  activo: true,
  stockBajo: false,
};

const pagedInventario = (page: number, totalPages = 4) => ({
  content: [articulo],
  page: {
    size: 20,
    number: page,
    totalElements: totalPages * 20,
    totalPages,
  },
});

describe('InventarioPage — estado navegable', () => {
  it('hidrata el deep link al habilitarse el plan sin navegar de nuevo', async () => {
    const user = userEvent.setup();
    let inventarioEnabled = false;
    const requests: Array<{ q: string | null; page: string | null; size: string | null }> = [];
    useFuncionesMock.mockImplementation(() => ({ inventario: inventarioEnabled }));

    server.use(
      http.get(`${API}/inventario`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push({
          q: params.get('q'),
          page: params.get('page'),
          size: params.get('size'),
        });
        return HttpResponse.json(pagedInventario(Number(params.get('page'))));
      }),
    );

    const Harness = () => {
      const [, forceRender] = useState(0);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              inventarioEnabled = true;
              forceRender((value) => value + 1);
            }}
          >
            Habilitar inventario
          </button>
          <InventarioPage />
        </>
      );
    };

    const { router } = renderWithProviders(<Harness />, {
      initialEntries: ['/inventario?q=%20oled%20&page=2'],
    });

    expect(requests).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Habilitar inventario' }));

    expect(screen.getByRole('searchbox', { name: /buscar inventario/i })).toHaveValue(' oled ');
    await waitFor(() => expect(requests).toContainEqual({ q: 'oled', page: '2', size: '20' }));
    expect(router.state.location.search).toBe('?q=%20oled%20&page=2');
    expect(router.state.historyAction).toBe('POP');
  });

  it('conserva la búsqueda al avanzar de página', async () => {
    const user = userEvent.setup();
    const requests: Array<{ q: string | null; page: string | null }> = [];
    useFuncionesMock.mockReturnValue({ inventario: true });

    server.use(
      http.get(`${API}/inventario`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push({ q: params.get('q'), page: params.get('page') });
        return HttpResponse.json(pagedInventario(Number(params.get('page'))));
      }),
    );

    const { router } = renderWithProviders(<InventarioPage />, {
      initialEntries: ['/inventario'],
    });
    await screen.findByText('Pantalla OLED');

    await user.type(screen.getByRole('searchbox', { name: /buscar inventario/i }), 'oled');
    await waitFor(() => expect(requests).toContainEqual({ q: 'oled', page: '0' }), { timeout: 1_000 });

    const nextButton = screen.getByRole('button', { name: 'Siguiente' });
    await waitFor(() => expect(nextButton).toBeEnabled());
    await user.click(nextButton);

    await waitFor(() => expect(requests).toContainEqual({ q: 'oled', page: '1' }));
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('oled');
    expect(new URLSearchParams(router.state.location.search).get('page')).toBe('1');
  });

  it('canonicaliza valores inválidos antes de consultar al backend', async () => {
    const requests: Array<{ q: string | null; page: string | null }> = [];
    useFuncionesMock.mockReturnValue({ inventario: true });

    server.use(
      http.get(`${API}/inventario`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push({ q: params.get('q'), page: params.get('page') });
        return HttpResponse.json(pagedInventario(Number(params.get('page')), 1));
      }),
    );

    const { router } = renderWithProviders(<InventarioPage />, {
      initialEntries: ['/inventario?q=%20%20&page=-2&page=7'],
    });

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    expect(requests).toEqual(requests.map(() => ({ q: null, page: '0' })));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('corrige una página huérfana con REPLACE', async () => {
    const requestedPages: number[] = [];
    useFuncionesMock.mockReturnValue({ inventario: true });

    server.use(
      http.get(`${API}/inventario`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        requestedPages.push(page);
        return HttpResponse.json(pagedInventario(page, 3));
      }),
    );

    const { router } = renderWithProviders(<InventarioPage />, {
      initialEntries: ['/antes', '/inventario?page=8'],
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
});
