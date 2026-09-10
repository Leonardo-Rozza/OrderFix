import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountLegalHistory } from './AccountLegalHistory';
import {
  getAccountLegalHistory, getHistoricalLegalDocument,
  type AccountLegalHistoryPage, type HistoricalLegalDocument,
} from '../api/accountLegal';

vi.mock('../api/accountLegal', () => ({ getAccountLegalHistory: vi.fn(), getHistoricalLegalDocument: vi.fn() }));
const uuid = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const reference = { documentoVersionId: uuid(3), tipo: 'TERMINOS_SERVICIO' as const,
  version: '2026.1', titulo: 'Términos históricos', sha256: 'a'.repeat(64) };
const history = (): AccountLegalHistoryPage => ({
  content: [{ id: uuid(1), requisitoVersionId: uuid(2), contexto: 'REGISTRO', tipoActo: 'ACEPTACION',
    afirmacion: 'Acepto la versión presentada al registrar mi cuenta.', afirmacionSha256: 'b'.repeat(64),
    documentos: [reference], aceptadoEn: '2026-09-09T12:34:56.123456Z' }],
  page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
});
const document = (): HistoricalLegalDocument => ({
  id: reference.documentoVersionId, tipo: reference.tipo, version: reference.version, titulo: reference.titulo,
  sha256: reference.sha256, estado: 'REEMPLAZADA', locale: 'es-AR', vigenteDesde: '2026-08-23T00:00:00Z',
  contenidoMarkdown: '# Texto de la versión histórica\n\nContenido completo anterior.',
});
const mount = (client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => ({
  ...render(<QueryClientProvider client={client}><AccountLegalHistory /></QueryClientProvider>), client,
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAccountLegalHistory).mockResolvedValue(history());
  vi.mocked(getHistoricalLegalDocument).mockResolvedValue(document());
});

describe('AccountLegalHistory', () => {
  it('muestra actos, afirmación y fecha real sin aceptar nada ni descargar documentos inicialmente', async () => {
    const data = history();
    data.content = ['ACEPTACION', 'LECTURA', 'DECLARACION'].map((tipoActo, index) => ({ ...data.content[0],
      id: uuid(index + 10), requisitoVersionId: uuid(index + 30), tipoActo: tipoActo as typeof data.content[0]['tipoActo'] }));
    data.page.totalElements = 3;
    vi.mocked(getAccountLegalHistory).mockResolvedValue(data);
    const { container } = mount();
    await screen.findByRole('heading', { name: 'Aceptación · Registro de cuenta' });
    expect(screen.getByRole('heading', { name: 'Lectura · Registro de cuenta' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Declaración · Registro de cuenta' })).toBeVisible();
    expect(screen.getAllByText(data.content[0].afirmacion)).toHaveLength(3);
    expect(container.querySelector('time')).toHaveAttribute('datetime', data.content[0].aceptadoEn);
    expect(getHistoricalLegalDocument).not.toHaveBeenCalled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(getAccountLegalHistory).toHaveBeenCalledWith(0, expect.any(AbortSignal));
  });

  it.each([404, 503])('un fallo %s no muestra historial vacío y requiere reintento explícito', async (status) => {
    vi.mocked(getAccountLegalHistory).mockRejectedValueOnce({ response: { status } }).mockResolvedValueOnce(history());
    const user = userEvent.setup();
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('este error no indica que no tengas registros');
    expect(screen.queryByText('No hay registros legales para tu usuario.')).not.toBeInTheDocument();
    expect(getAccountLegalHistory).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Reintentar historial' }));
    await screen.findByText(history().content[0].afirmacion);
    expect(getAccountLegalHistory).toHaveBeenCalledTimes(2);
  });

  it('explica una respuesta vacía válida', async () => {
    vi.mocked(getAccountLegalHistory).mockResolvedValue({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } });
    mount();
    expect(await screen.findByText('No hay registros legales para tu usuario.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('pagina sin conservar la página anterior visible y cierra el lector al navegar', async () => {
    const user = userEvent.setup();
    const first = history();
    first.content = Array.from({ length: 20 }, (_, index) => ({ ...first.content[0],
      id: uuid(index + 10), requisitoVersionId: uuid(index + 40), afirmacion: `Afirmación de página uno ${index + 1}` }));
    first.page.totalElements = 21; first.page.totalPages = 2;
    const second = history();
    second.content[0].afirmacion = 'Afirmación de página dos';
    second.page = { size: 20, number: 1, totalElements: 21, totalPages: 2 };
    let resolveSecond!: (value: AccountLegalHistoryPage) => void;
    vi.mocked(getAccountLegalHistory).mockResolvedValueOnce(first).mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
    mount();
    await screen.findByText('Afirmación de página uno 1');
    await user.click(screen.getAllByRole('button', { name: 'Leer Términos históricos · versión 2026.1' })[0]);
    await screen.findByRole('region', { name: 'Términos históricos · versión 2026.1' });
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.queryByText('Afirmación de página uno 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Términos históricos · versión 2026.1' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu historial');
    await act(async () => resolveSecond(second));
    await screen.findByText('Afirmación de página dos');
    expect(getAccountLegalHistory).toHaveBeenLastCalledWith(1, expect.any(AbortSignal));
    expect(screen.getByText('Página 2 de 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('lee la referencia exacta a demanda, conserva el texto completo y no activa HTML ni enlaces', async () => {
    const user = userEvent.setup();
    const unsafeMarkdown = '<script>window.stolen = true</script>\n<img src=x onerror="alert(1)">\n[enlace](javascript:alert(1))';
    vi.mocked(getHistoricalLegalDocument).mockResolvedValue({ ...document(), contenidoMarkdown: unsafeMarkdown });
    const { container } = mount();
    await user.click(await screen.findByRole('button', { name: 'Leer Términos históricos · versión 2026.1' }));
    const region = await screen.findByRole('region', { name: 'Términos históricos · versión 2026.1' });
    expect(region.textContent).toBe(unsafeMarkdown);
    expect(container.querySelector('script, img, a')).toBeNull();
    expect(screen.getByText('Versión reemplazada · Versión 2026.1')).toBeVisible();
    expect(getHistoricalLegalDocument).toHaveBeenCalledExactlyOnceWith(reference, expect.any(AbortSignal));
    expect(localStorage.length).toBe(0);
  });

  it('un documento no verificable no sustituye el texto histórico por el vigente ni oculta la evidencia', async () => {
    const user = userEvent.setup();
    vi.mocked(getHistoricalLegalDocument).mockRejectedValueOnce(new Error('El documento no coincide')).mockResolvedValueOnce(document());
    mount();
    await user.click(await screen.findByRole('button', { name: 'Leer Términos históricos · versión 2026.1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer y verificar esta versión');
    expect(screen.getByText(history().content[0].afirmacion)).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Términos históricos · versión 2026.1' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar documento' }));
    await screen.findByRole('region', { name: 'Términos históricos · versión 2026.1' });
    expect(getHistoricalLegalDocument).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getHistoricalLegalDocument).mock.calls.map(([snapshot]) => snapshot.documentoVersionId)).toEqual([reference.documentoVersionId, reference.documentoVersionId]);
  });

  it('cerrar un lector aborta su petición y no renderiza una respuesta tardía', async () => {
    const user = userEvent.setup();
    let complete!: (value: HistoricalLegalDocument) => void;
    vi.mocked(getHistoricalLegalDocument).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    mount();
    await user.click(await screen.findByRole('button', { name: 'Leer Términos históricos · versión 2026.1' }));
    const signal = vi.mocked(getHistoricalLegalDocument).mock.calls[0][1];
    await user.click(screen.getByRole('button', { name: 'Cerrar Términos históricos · versión 2026.1' }));
    expect(signal.aborted).toBe(true);
    await act(async () => complete(document()));
    expect(screen.queryByRole('region', { name: 'Términos históricos · versión 2026.1' })).not.toBeInTheDocument();
  });

  it('un montaje nuevo no reutiliza historial del anterior y gcTime cero libera sus queries', async () => {
    const client = new QueryClient();
    const first = mount(client);
    await screen.findByText(history().content[0].afirmacion);
    first.unmount();
    vi.mocked(getAccountLegalHistory).mockImplementationOnce(() => new Promise(() => {}));
    const second = mount(client);
    expect(screen.queryByText(history().content[0].afirmacion)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeVisible();
    expect(getAccountLegalHistory).toHaveBeenCalledTimes(2);
    const signal = vi.mocked(getAccountLegalHistory).mock.calls[1][1];
    second.unmount();
    expect(signal.aborted).toBe(true);
    await waitFor(() => expect(client.getQueryCache().getAll()).toHaveLength(0));
  });
});
