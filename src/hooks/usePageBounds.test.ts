import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePageBounds } from './usePageBounds';

describe('usePageBounds', () => {
  it('vuelve a la última página válida cuando la actual queda huérfana', async () => {
    const onChange = vi.fn();

    renderHook(() => usePageBounds(3, onChange, { totalPages: 2 }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(1));
  });

  it('vuelve a cero si la colección quedó vacía', async () => {
    const onChange = vi.fn();

    renderHook(() => usePageBounds(2, onChange, { totalPages: 0 }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(0));
  });

  it('no usa metadata perteneciente a datos placeholder', () => {
    const onChange = vi.fn();

    renderHook(() => usePageBounds(3, onChange, { totalPages: 1 }, false));

    expect(onChange).not.toHaveBeenCalled();
  });
});
