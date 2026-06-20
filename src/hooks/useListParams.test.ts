import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useListParams } from './useListParams';

describe('useListParams', () => {
  it('onSearch actualiza q y vuelve a la página 0', () => {
    const { result } = renderHook(() => useListParams());
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    act(() => result.current.onSearch('pantalla'));
    expect(result.current.q).toBe('pantalla');
    expect(result.current.page).toBe(0);
  });

  it('debouncedQ se actualiza con retraso', async () => {
    const { result } = renderHook(() => useListParams());
    act(() => result.current.onSearch('iphone'));
    expect(result.current.debouncedQ).toBe('');
    await waitFor(() => expect(result.current.debouncedQ).toBe('iphone'));
  });
});
