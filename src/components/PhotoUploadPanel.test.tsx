import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoUploadPanel } from './PhotoUploadPanel';
import {
  getPhotoRequirements, preparePhotoAttempt, uploadPhotoAttempt, PhotoIntentTerminalError,
  type PhotoAttempt, type PhotoRequirements, type PrivatePhoto,
} from '../api/repairPhotos';

vi.mock('../api/repairPhotos', async (original) => ({
  ...await original<typeof import('../api/repairPhotos')>(),
  getPhotoRequirements: vi.fn(), preparePhotoAttempt: vi.fn(), uploadPhotoAttempt: vi.fn(),
}));
const id = '00000000-0000-4000-8000-000000000001';
const snapshot: PhotoRequirements = {
  locale: 'es-AR', requiredSetRevision: `sha256:${'a'.repeat(64)}`,
  limites: { maxBytes: 8_000_000, mimeTypes: ['image/jpeg', 'image/png'] },
  requisitos: [{ id, contexto: 'ATESTACION_FOTOS', tipoActo: 'DECLARACION', afirmacion: 'Cuento con autorización del cliente',
    afirmacionSha256: 'b'.repeat(64), requerido: true, documentos: [{ id, tipo: 'ATESTACION_DATOS_CLIENTE', version: '1',
      titulo: 'Condiciones de fotos', contenidoMarkdown: 'Texto íntegro <script>inactivo</script>', sha256: 'c'.repeat(64),
      vigenteDesde: '2026-09-09T00:00:00Z', estado: 'VIGENTE', locale: 'es-AR' }] }],
};
const file = new File(['a'], 'private-local.jpg', { type: 'image/jpeg' });
const photo: PrivatePhoto = { id, momento: 'INGRESO', mimeType: 'image/jpeg', bytes: 1, sha256: 'd'.repeat(64), createdAt: '2026-09-09T00:01:00Z' };
const photos = [{ file, momento: 'INGRESO' as const }];
const attempt = (key: string): PhotoAttempt => ({ key, file, payload: {
  nombre: file.name, mimeType: file.type, bytes: 1, sha256: 'd'.repeat(64), momento: 'INGRESO',
  requiredSetRevision: snapshot.requiredSetRevision, aceptacionesLegales: [],
  atestacion: { tipo: 'AUTORIZACION_DATOS_CLIENTE', alcances: ['FOTOS'], confirmada: true },
} });
const confirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('checkbox', { name: /Cuento con autorización/ }));
  await user.click(screen.getByRole('checkbox', { name: /Confirmo que cuento/ }));
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPhotoRequirements).mockResolvedValue(snapshot);
  vi.mocked(preparePhotoAttempt).mockImplementation(async () => attempt(crypto.randomUUID()));
  vi.mocked(uploadPhotoAttempt).mockResolvedValue(photo);
});
afterEach(() => vi.useRealTimers());

describe('PhotoUploadPanel', () => {
  it('lee requisitos sin transmitir nombre/archivo y requiere ambas confirmaciones explícitas', async () => {
    const user = userEvent.setup();
    const done = vi.fn();
    const { container } = render(<PhotoUploadPanel repairId={9} photos={photos} onComplete={done} onBusyChange={vi.fn()} />);
    const submit = await screen.findByRole('button', { name: 'Confirmar y guardar fotos' });
    expect(submit).toBeDisabled();
    expect(getPhotoRequirements).toHaveBeenCalledWith(9, expect.any(AbortSignal));
    expect(preparePhotoAttempt).not.toHaveBeenCalled();
    expect(uploadPhotoAttempt).not.toHaveBeenCalled();
    await user.click(screen.getByText('Condiciones de fotos · 1'));
    expect(screen.getByText('Texto íntegro <script>inactivo</script>')).toBeVisible();
    expect(container.querySelector('script')).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: /Cuento con autorización/ }));
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Confirmo que cuento/ }));
    await user.click(submit);
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(preparePhotoAttempt).toHaveBeenCalledWith(photos[0], snapshot, new Set([id]));
    expect(localStorage.length).toBe(0);
  });
  it('backend deshabilitado no transmite archivos y explica que la orden se conserva', async () => {
    vi.mocked(getPhotoRequirements).mockRejectedValue({ response: { status: 503, data: { code: 'FOTOS_PRIVADAS_NO_DISPONIBLES' } } });
    render(<PhotoUploadPanel repairId={9} photos={photos} onComplete={vi.fn()} onBusyChange={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('la orden se conserva');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(preparePhotoAttempt).not.toHaveBeenCalled();
    expect(uploadPhotoAttempt).not.toHaveBeenCalled();
  });
  it('un error recuperable conserva exactamente el intento y bloquea edición de su consentimiento', async () => {
    const user = userEvent.setup();
    const done = vi.fn();
    vi.mocked(uploadPhotoAttempt).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(photo);
    render(<PhotoUploadPanel repairId={9} photos={photos} onComplete={done} onBusyChange={vi.fn()} />);
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar fotos' }));
    await screen.findByText(/No se completó la carga/);
    expect(screen.getByRole('checkbox', { name: /Confirmo que cuento/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reintentar fotos' }));
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(preparePhotoAttempt).toHaveBeenCalledOnce();
    expect(vi.mocked(uploadPhotoAttempt).mock.calls[0][1]).toBe(vi.mocked(uploadPhotoAttempt).mock.calls[1][1]);
  });
  it('stale refresca las condiciones y exige nueva confirmación antes de crear otro intento', async () => {
    const user = userEvent.setup();
    const changed = { ...snapshot, requiredSetRevision: `sha256:${'e'.repeat(64)}` };
    vi.mocked(getPhotoRequirements).mockResolvedValueOnce(snapshot).mockResolvedValueOnce(changed);
    vi.mocked(uploadPhotoAttempt).mockRejectedValueOnce({ response: { status: 409, data: { code: 'REQUISITOS_LEGALES_DESACTUALIZADOS' } } }).mockResolvedValueOnce(photo);
    const done = vi.fn();
    render(<PhotoUploadPanel repairId={9} photos={photos} onComplete={done} onBusyChange={vi.fn()} />);
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar fotos' }));
    await screen.findByText(/Las condiciones cambiaron/);
    expect(screen.getByRole('checkbox', { name: /Confirmo que cuento/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Confirmar y guardar fotos' })).toBeDisabled();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar fotos' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(vi.mocked(preparePhotoAttempt).mock.calls[1][1]).toBe(changed);
    expect(vi.mocked(uploadPhotoAttempt).mock.calls[0][1]).not.toBe(vi.mocked(uploadPhotoAttempt).mock.calls[1][1]);
  });
  it('un intento terminal conserva archivos y orden, solicita nueva autorización y no repite fotos completadas', async () => {
    const user = userEvent.setup();
    const done = vi.fn();
    const saved = attempt('saved');
    const expired = attempt('expired');
    const renewed = attempt('renewed');
    vi.mocked(preparePhotoAttempt).mockResolvedValueOnce(saved).mockResolvedValueOnce(expired).mockResolvedValueOnce(renewed);
    let expiredOnce = false;
    const writes: string[] = [];
    vi.mocked(uploadPhotoAttempt).mockImplementation(async (_repair, current) => {
      if (current.completed) return current.completed;
      if (current === expired && !expiredOnce) {
        expiredOnce = true;
        throw new PhotoIntentTerminalError();
      }
      writes.push(current.key);
      current.completed = photo;
      return photo;
    });
    render(<PhotoUploadPanel repairId={9} photos={[...photos, { file, momento: 'POST_REPARACION' }]} onComplete={done} onBusyChange={vi.fn()} />);
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar fotos' }));
    await screen.findByText(/La intención anterior terminó/);
    expect(screen.getByText(/1 de 2 fotos guardadas/)).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /Confirmo que cuento/ })).not.toBeChecked();
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Reintentar fotos' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(writes).toEqual(['saved', 'renewed']);
    expect(preparePhotoAttempt).toHaveBeenCalledTimes(3);
    expect(vi.mocked(uploadPhotoAttempt).mock.calls.every(([repairId]) => repairId === 9)).toBe(true);
  });
  it('al desmontar aborta la operación y no ejecuta éxito tardío', async () => {
    const user = userEvent.setup();
    let finish!: (value: PrivatePhoto) => void;
    vi.mocked(uploadPhotoAttempt).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const done = vi.fn();
    const { unmount } = render(<PhotoUploadPanel repairId={9} photos={photos} onComplete={done} onBusyChange={vi.fn()} />);
    await confirm(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar fotos' }));
    await waitFor(() => expect(uploadPhotoAttempt).toHaveBeenCalled());
    const requestSignal = vi.mocked(uploadPhotoAttempt).mock.calls[0][2];
    unmount();
    expect(requestSignal.aborted).toBe(true);
    await act(async () => finish(photo));
    expect(done).not.toHaveBeenCalled();
  });
});
