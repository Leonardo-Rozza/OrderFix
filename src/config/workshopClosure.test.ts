import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it.each([['true', true], ['false', false], ['', false], ['TRUE', false], ['1', false], [' true ', false], [undefined, false]])(
  'el flag %s sólo habilita cierre si es true exacto', async (value, enabled) => {
    vi.resetModules(); vi.stubEnv('VITE_WORKSHOP_CLOSURE_ENABLED', value);
    const { workshopClosureEnabled } = await import('./workshopClosure');
    expect(workshopClosureEnabled).toBe(enabled);
  },
);
