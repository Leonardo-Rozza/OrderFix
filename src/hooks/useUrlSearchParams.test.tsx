import { useEffect } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  composeSearchParamsNormalizers,
  normalizeEnumParam,
  normalizeNonNegativeIntegerParam,
  normalizeSearchQueryParam,
  setCanonicalSearchParam,
} from '../lib/urlSearchParams';
import { renderWithProviders } from '../test/renderWithProviders';
import { useUrlSearchParams } from './useUrlSearchParams';

const SORTS = ['nombre,asc', 'id,desc'] as const;
const normalizeHarnessParams = composeSearchParamsNormalizers(
  (params) => { normalizeSearchQueryParam(params); },
  (params) => { normalizeNonNegativeIntegerParam(params, 'page'); },
  (params) => { normalizeEnumParam(params, 'sort', SORTS, 'nombre,asc'); },
);

interface HarnessProps {
  onIdentity?: (callback: unknown) => void;
}

const Harness = ({ onIdentity }: HarnessProps) => {
  const { searchParams, updateSearchParams } = useUrlSearchParams(normalizeHarnessParams);

  useEffect(() => {
    onIdentity?.(updateSearchParams);
  }, [onIdentity, updateSearchParams]);

  return (
    <>
      <output data-testid="search">{searchParams.toString()}</output>
      <button
        type="button"
        onClick={() => updateSearchParams((next) => {
          setCanonicalSearchParam(next, 'q', 'iphone');
          next.delete('page');
        }, { replace: true })}
      >
        Buscar
      </button>
      <button
        type="button"
        onClick={() => updateSearchParams((next) => {
          setCanonicalSearchParam(next, 'page', '2', '0');
        })}
      >
        Página 2
      </button>
    </>
  );
};

describe('useUrlSearchParams', () => {
  it('expone valores seguros y reemplaza una URL inválida por su forma canónica', async () => {
    const { router } = renderWithProviders(<Harness />, {
      initialEntries: ['/items?q=%20%20&page=-1&page=2&sort=hack&externo=1'],
    });

    expect(screen.getByTestId('search')).toHaveTextContent('externo=1');
    await waitFor(() => expect(router.state.location.search).toBe('?externo=1'));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('aplica una interacción completa sobre una copia y preserva parámetros ajenos', async () => {
    const { router } = renderWithProviders(<Harness />, {
      initialEntries: ['/items?page=4&sort=id%2Cdesc&nuevo=1'],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('q')).toBe('iphone');
      expect(params.has('page')).toBe(false);
      expect(params.get('sort')).toBe('id,desc');
      expect(params.get('nuevo')).toBe('1');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('usa PUSH para una decisión explícita', async () => {
    const { router } = renderWithProviders(<Harness />, {
      initialEntries: ['/items?externo=1'],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    await waitFor(() => expect(router.state.location.search).toContain('page=2'));
    expect(router.state.historyAction).toBe('PUSH');
  });

  it('mantiene estable el escritor cuando sólo cambia la URL', async () => {
    const onIdentity = vi.fn();
    const { router } = renderWithProviders(<Harness onIdentity={onIdentity} />);

    expect(onIdentity).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    expect(onIdentity).toHaveBeenCalledTimes(1);

    await act(async () => {
      await router.navigate('/items?page=3');
    });
    expect(onIdentity).toHaveBeenCalledTimes(1);
  });
});
