import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRetryAfter } from './useRetryAfter';

describe('useRetryAfter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cuenta hacia cero y limpia el timer al desmontar', () => {
    const { result, unmount } = renderHook(() => useRetryAfter());

    act(() => {
      expect(
        result.current.startRetryAfter({
          response: { status: 429, headers: { 'retry-after': '3' } },
        }),
      ).toBe(true);
    });

    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.secondsRemaining).toBe(3);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.secondsRemaining).toBe(2);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignora errores que no son 429', () => {
    const { result } = renderHook(() => useRetryAfter());

    act(() => {
      expect(result.current.startRetryAfter({ response: { status: 500 } })).toBe(false);
    });

    expect(result.current.isCoolingDown).toBe(false);
  });
});
