import { useState, type ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AsyncCombobox,
  type AsyncComboboxOption,
  type AsyncComboboxSource,
} from './AsyncCombobox';

const page = (
  options: AsyncComboboxOption[],
  number: number,
  totalPages: number,
  totalElements = options.length,
) => ({
  options,
  page: { size: 20, number, totalElements, totalPages },
});

const renderWithClient = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const Controlled = ({ source }: { source: AsyncComboboxSource }) => {
  const [value, setValue] = useState<number>();
  return (
    <AsyncCombobox
      source={source}
      value={value}
      onChange={setValue}
      aria-label="Cliente"
      searchAriaLabel="Buscar cliente"
      entityName="cliente"
      entityNamePlural="clientes"
      debounceMs={0}
    />
  );
};

describe('AsyncCombobox', () => {
  it('consulta recién al abrir y envía el término asentado con página y signal', async () => {
    const user = userEvent.setup();
    const loadPage = vi.fn(async ({ query, page: number }: { query: string; page: number }) => (
      page([{ value: 1, label: query ? 'Ana filtrada' : 'Ana' }], number, 1)
    ));
    const source: AsyncComboboxSource = {
      queryKey: ({ query, size }) => ['clientes', 'options', { query, size }],
      loadPage,
    };

    renderWithClient(<Controlled source={source} />);
    expect(loadPage).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    expect(await screen.findByRole('option', { name: 'Ana' })).toBeVisible();
    expect(loadPage).toHaveBeenLastCalledWith(expect.objectContaining({
      query: '',
      page: 0,
      size: 20,
      signal: expect.any(AbortSignal),
    }));

    await user.type(screen.getByRole('combobox', { name: 'Buscar cliente' }), '  ana  ');
    expect(await screen.findByRole('option', { name: 'Ana filtrada' })).toBeVisible();
    expect(loadPage).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'ana', page: 0 }));
  });

  it('carga otra página, deduplica y conserva la selección fuera de la búsqueda', async () => {
    const user = userEvent.setup();
    const source: AsyncComboboxSource = {
      queryKey: ({ query, size }) => ['clientes', 'options', { query, size }],
      loadPage: vi.fn(async ({ query, page: number }) => {
        if (query) return page([], number, 1, 0);
        if (number === 0) return page([{ value: 1, label: 'Ana' }], 0, 2, 2);
        return page([
          { value: 1, label: 'Ana repetida' },
          { value: 2, label: 'Bruno' },
        ], 1, 2, 2);
      }),
    };

    renderWithClient(<Controlled source={source} />);
    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    await user.click(await screen.findByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByRole('option', { name: 'Bruno' })).toBeVisible();
    expect(screen.getAllByRole('option', { name: /Ana/ })).toHaveLength(1);

    await user.click(screen.getByRole('option', { name: 'Bruno' }));
    expect(screen.getByRole('button', { name: 'Cliente' })).toHaveTextContent('Bruno');

    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    await user.type(screen.getByRole('combobox', { name: 'Buscar cliente' }), 'nadie');
    expect(await screen.findByText(/no encontramos clientes/i)).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Cliente' })).toHaveTextContent('Bruno');
  });

  it('muestra el error inline y permite reintentar', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const source: AsyncComboboxSource = {
      queryKey: ({ query, size }) => ['clientes', 'options', { query, size }],
      loadPage: vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('temporal');
        return page([{ value: 1, label: 'Ana' }], 0, 1);
      }),
    };

    renderWithClient(<Controlled source={source} />);
    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos cargar clientes/i);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('option', { name: 'Ana' })).toBeVisible();
    expect(attempts).toBe(2);
  });

  it('conserva resultados y explica un error de página siguiente antes de reintentar', async () => {
    const user = userEvent.setup();
    let secondPageAttempts = 0;
    const source: AsyncComboboxSource = {
      queryKey: ({ query, size }) => ['clientes', 'options', { query, size }],
      loadPage: vi.fn(async ({ page: number }) => {
        if (number === 0) return page([{ value: 1, label: 'Ana' }], 0, 2, 2);
        secondPageAttempts += 1;
        if (secondPageAttempts === 1) throw new Error('falló página 2');
        return page([{ value: 2, label: 'Bruno' }], 1, 2, 2);
      }),
    };

    renderWithClient(<Controlled source={source} />);
    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    expect(await screen.findByRole('option', { name: 'Ana' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cargar más' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos cargar clientes/i);
    expect(screen.getByRole('option', { name: 'Ana' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('option', { name: 'Bruno' })).toBeVisible();
    expect(secondPageAttempts).toBe(2);
  });

  it('prioriza la selección segura del formulario sobre una etiqueta cacheada', async () => {
    const user = userEvent.setup();
    const source: AsyncComboboxSource = {
      queryKey: ({ query, size }) => ['clientes', 'options', { query, size }],
      loadPage: vi.fn(async () => page([{ value: 1, label: 'Nombre cacheado' }], 0, 1)),
    };

    renderWithClient(
      <AsyncCombobox
        source={source}
        value={1}
        onChange={vi.fn()}
        selectedOption={{ value: 1, label: 'Nombre de la ficha' }}
        aria-label="Cliente"
        searchAriaLabel="Buscar cliente"
        entityName="cliente"
        entityNamePlural="clientes"
        debounceMs={0}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Cliente' });
    expect(trigger).toHaveTextContent('Nombre de la ficha');
    await user.click(trigger);
    expect(await screen.findByRole('option', { name: 'Nombre cacheado' })).toBeVisible();
    expect(trigger).toHaveTextContent('Nombre de la ficha');
  });

  it('salta como máximo una página filtrada y deja la siguiente carga en manos del usuario', async () => {
    const source: AsyncComboboxSource = {
      queryKey: ({ query, size }) => ['reparaciones', 'options', { query, size }],
      maxAutomaticPages: 1,
      loadPage: vi.fn(async ({ page: number }) => page([], number, 4, 80)),
    };

    renderWithClient(
      <AsyncCombobox
        source={source}
        value={undefined}
        onChange={vi.fn()}
        aria-label="Reparación"
        searchAriaLabel="Buscar reparación"
        entityName="reparación"
        entityNamePlural="reparaciones"
        partialEmptyMessage="No hay órdenes abiertas entre las cargadas."
        debounceMs={0}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reparación' }));
    await waitFor(() => expect(source.loadPage).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    expect(source.loadPage).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/no hay órdenes abiertas entre las cargadas/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cargar más' })).toBeVisible();
  });
});
