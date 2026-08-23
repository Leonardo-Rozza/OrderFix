import { useEffect } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { useListParams, type UseListParamsOptions } from './useListParams';

const LIST_OPTIONS = {
  size: 20,
  defaultSort: 'nombre,asc',
  allowedSorts: ['nombre,asc', 'id,desc'],
} as const satisfies UseListParamsOptions;

interface HarnessProps {
  onIdentity?: (callbacks: readonly unknown[]) => void;
}

const Harness = ({ onIdentity }: HarnessProps) => {
  const {
    q,
    onSearch,
    page,
    setPage,
    replacePage,
    debouncedQ,
    size,
    sort,
    setSort,
  } = useListParams(LIST_OPTIONS);

  useEffect(() => {
    onIdentity?.([onSearch, setPage, replacePage, setSort]);
  }, [onIdentity, onSearch, replacePage, setPage, setSort]);

  return (
    <>
      <label>
        Buscar
        <input value={q} onChange={(event) => onSearch(event.target.value)} />
      </label>
      <output data-testid="page">{page}</output>
      <output data-testid="debounced-q">{debouncedQ}</output>
      <output data-testid="size">{size}</output>
      <output data-testid="sort">{sort}</output>
      <button type="button" onClick={() => setPage(2)}>Página 2</button>
      <button type="button" onClick={() => replacePage(1)}>Corregir página</button>
      <button type="button" onClick={() => setSort('id,desc')}>Ordenar por ID</button>
    </>
  );
};

describe('useListParams', () => {
  it('hidrata un deep link y restaura la consulta sin espera artificial', () => {
    renderWithProviders(<Harness />, {
      initialEntries: ['/items?q=%20Ada%20&page=2&sort=id%2Cdesc&nuevo=1'],
    });

    expect(screen.getByRole('textbox', { name: 'Buscar' })).toHaveValue(' Ada ');
    expect(screen.getByTestId('page')).toHaveTextContent('2');
    expect(screen.getByTestId('debounced-q')).toHaveTextContent('Ada');
    expect(screen.getByTestId('size')).toHaveTextContent('20');
    expect(screen.getByTestId('sort')).toHaveTextContent('id,desc');
  });

  it('canonicaliza valores inválidos antes de exponerlos', async () => {
    const { router } = renderWithProviders(<Harness />, {
      initialEntries: ['/items?q=%20%20&page=01&sort=hack&nuevo=1'],
    });

    expect(screen.getByRole('textbox', { name: 'Buscar' })).toHaveValue('');
    expect(screen.getByTestId('page')).toHaveTextContent('0');
    expect(screen.getByTestId('sort')).toHaveTextContent('nombre,asc');
    await waitFor(() => expect(router.state.location.search).toBe('?nuevo=1'));
  });

  it('reemplaza la búsqueda, reinicia página atómicamente y mantiene el debounce', async () => {
    const { router } = renderWithProviders(<Harness />, {
      initialEntries: ['/antes', '/items?page=3&sort=id%2Cdesc&nuevo=1'],
      initialIndex: 1,
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar' }), {
      target: { value: 'iphone' },
    });

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('q')).toBe('iphone');
      expect(params.has('page')).toBe(false);
      expect(params.get('sort')).toBe('id,desc');
      expect(params.get('nuevo')).toBe('1');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByTestId('debounced-q')).toHaveTextContent('');
    await waitFor(
      () => expect(screen.getByTestId('debounced-q')).toHaveTextContent('iphone'),
      { timeout: 1_000 },
    );

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/antes');
  });

  it('agrega página y orden al historial para restaurarlos con Atrás y Adelante', async () => {
    const { router } = renderWithProviders(<Harness />, {
      initialEntries: ['/items'],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por ID' }));
    await waitFor(() => expect(router.state.location.search).toBe('?sort=id%2Cdesc'));

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.search).toBe('?page=2');
    expect(screen.getByTestId('page')).toHaveTextContent('2');
    expect(screen.getByTestId('sort')).toHaveTextContent('nombre,asc');

    await act(async () => {
      await router.navigate(1);
    });
    expect(router.state.location.search).toBe('?sort=id%2Cdesc');
    expect(screen.getByTestId('page')).toHaveTextContent('0');
    expect(screen.getByTestId('sort')).toHaveTextContent('id,desc');
  });

  it('mantiene la búsqueda restaurada durante el REPLACE de canonicalización', async () => {
    const { router } = renderWithProviders(<Harness />, {
      initialEntries: [
        '/items?q=restaurada&page=0',
        '/items?q=actual',
      ],
      initialIndex: 1,
    });

    expect(screen.getByTestId('debounced-q')).toHaveTextContent('actual');
    await act(async () => {
      await router.navigate(-1);
    });

    expect(screen.getByRole('textbox', { name: 'Buscar' })).toHaveValue('restaurada');
    expect(screen.getByTestId('debounced-q')).toHaveTextContent('restaurada');
    await waitFor(() => expect(router.state.location.search).toBe('?q=restaurada'));
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByTestId('debounced-q')).toHaveTextContent('restaurada');
  });

  it('usa REPLACE para corregir límites y conserva callbacks estables', async () => {
    const identities: unknown[][] = [];
    const onIdentity = vi.fn((callbacks: readonly unknown[]) => {
      identities.push([...callbacks]);
    });
    const { router } = renderWithProviders(<Harness onIdentity={onIdentity} />, {
      initialEntries: ['/items?page=4'],
    });

    const firstIdentities = identities[0];
    fireEvent.click(screen.getByRole('button', { name: 'Corregir página' }));
    await waitFor(() => expect(router.state.location.search).toBe('?page=1'));
    expect(router.state.historyAction).toBe('REPLACE');
    expect(onIdentity).toHaveBeenCalledTimes(1);
    expect(identities[0]).toEqual(firstIdentities);
  });
});
