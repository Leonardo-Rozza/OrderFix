import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResumenDigital } from '../../types';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import {
  fetchResumenDigital,
  useReciboQuery,
  useResumenDigitalQuery,
} from './cobros.queries';

describe('resumen digital query', () => {
  afterEach(() => vi.restoreAllMocks());

  it('usa el endpoint canónico con cancelación y error inline', async () => {
    const controller = new AbortController();
    const resumen = { numeroOrden: 'OF-1' } as ResumenDigital;
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: resumen });

    await expect(fetchResumenDigital(7, controller.signal)).resolves.toBe(resumen);

    expect(get).toHaveBeenCalledWith('/reparaciones/7/resumen-digital', {
      signal: controller.signal,
      errorMode: 'inline',
    });
  });

  it('conserva el nombre legacy como alias exacto del hook y de la caché', () => {
    expect(useReciboQuery).toBe(useResumenDigitalQuery);
    expect(queryKeys.resumenes).toBe(queryKeys.recibos);
    expect(queryKeys.resumenes.all).toBe(queryKeys.recibos.all);
    expect(queryKeys.resumenes.byReparacion(7)).toEqual(['recibo', 7]);
  });
});
