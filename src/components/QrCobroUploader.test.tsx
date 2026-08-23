import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlobImage } from './BlobImage';
import { QrCobroUploader, type QrCobroDraft } from './QrCobroUploader';

const createObjectUrl = vi.fn();
const revokeObjectUrl = vi.fn();

const Harness = ({ hasCurrent = false, currentBlob }: { hasCurrent?: boolean; currentBlob?: Blob }) => {
  const [value, setValue] = useState<QrCobroDraft>({ file: null, removeExisting: false });
  return (
    <QrCobroUploader
      id="qr"
      hasCurrent={hasCurrent}
      currentBlob={currentBlob}
      value={value}
      onChange={setValue}
    />
  );
};

describe('QrCobroUploader y BlobImage', () => {
  beforeEach(() => {
    createObjectUrl.mockReset();
    revokeObjectUrl.mockReset();
    let sequence = 0;
    createObjectUrl.mockImplementation(() => `blob:qr-${++sequence}`);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
  });

  afterEach(() => vi.restoreAllMocks());

  it('revoca la URL remota al cambiar de versión y al desmontar', () => {
    const first = new Blob(['uno'], { type: 'image/png' });
    const second = new Blob(['dos'], { type: 'image/png' });
    const { rerender, unmount } = render(
      <BlobImage blob={first} alt="QR remoto" />,
    );

    expect(screen.getByAltText('QR remoto')).toHaveAttribute('src', 'blob:qr-1');
    rerender(<BlobImage blob={second} alt="QR remoto" />);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:qr-1');
    expect(screen.getByAltText('QR remoto')).toHaveAttribute('src', 'blob:qr-2');

    unmount();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:qr-2');
  });

  it('crea preview local, revoca al reemplazar y resetea el input para el mismo archivo', () => {
    const { container } = render(<Harness />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const first = new File(['uno'], 'mi-qr.png', { type: 'image/png' });
    const second = new File(['dos'], 'nuevo-qr.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [first] } });
    expect(input).toHaveValue('');
    expect(screen.getByAltText('Vista previa del nuevo QR de cobro')).toHaveAttribute('src', 'blob:qr-1');
    expect(screen.getByText(/mi-qr\.png/)).toBeVisible();

    fireEvent.change(input, {
      target: { files: [new File(['svg'], 'invalido.svg', { type: 'image/svg+xml' })] },
    });
    expect(screen.getByText('Elegí una imagen PNG o JPEG.')).toHaveAttribute('role', 'alert');
    expect(screen.queryByAltText('Vista previa del nuevo QR de cobro')).not.toBeInTheDocument();
    expect(screen.queryByText(/mi-qr\.png/)).not.toBeInTheDocument();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:qr-1');

    fireEvent.change(input, { target: { files: [second] } });
    expect(screen.getByAltText('Vista previa del nuevo QR de cobro')).toHaveAttribute('src', 'blob:qr-2');
  });

  it('acepta una imagen válida del picker móvil aunque llegue sin MIME', () => {
    const { container } = render(<Harness />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const mobilePng = new File(['png'], 'QR-TALLER.PNG');

    fireEvent.change(input, { target: { files: [mobilePng] } });

    expect(screen.getByAltText('Vista previa del nuevo QR de cobro')).toBeVisible();
    expect(screen.queryByText('Elegí una imagen PNG o JPEG.')).not.toBeInTheDocument();
    expect(screen.getByText(/1 megapíxel total/i)).toBeVisible();
  });

  it('valida raster/tamaño inline y permite eliminar aunque falle el preview remoto', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <QrCobroUploader
        id="qr"
        hasCurrent
        currentError
        value={{ file: null, removeExisting: false }}
        onChange={onChange}
      />,
    );
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(input, {
      target: { files: [new File(['svg'], 'qr.svg', { type: 'image/svg+xml' })] },
    });
    expect(screen.getByText('Elegí una imagen PNG o JPEG.')).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('button', { name: 'Reemplazar QR' })).toHaveClass('min-h-11');

    await user.click(screen.getByRole('button', { name: 'Eliminar QR' }));
    expect(onChange).toHaveBeenCalledWith({ file: null, removeExisting: true });
  });

  it('expone progreso y errores asociados sin perder targets táctiles', () => {
    render(
      <QrCobroUploader
        id="qr"
        value={{ file: null, removeExisting: false }}
        onChange={vi.fn()}
        progress={48}
        error="No pudimos guardar el QR."
      />,
    );

    expect(screen.getByRole('progressbar', { name: 'Progreso de subida del QR' }))
      .toHaveAttribute('aria-valuenow', '48');
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos guardar el QR.');
    expect(screen.getByRole('button', { name: 'Seleccionar QR' })).toHaveAttribute('aria-describedby');
  });

  it('anuncia semánticamente la carga y el error asíncrono del preview', () => {
    const { rerender } = render(
      <QrCobroUploader
        id="qr"
        hasCurrent
        currentLoading
        value={{ file: null, removeExisting: false }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('status', { name: 'Cargando QR configurado' }))
      .toHaveAttribute('aria-live', 'polite');

    rerender(
      <QrCobroUploader
        id="qr"
        hasCurrent
        currentError
        value={{ file: null, removeExisting: false }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar el QR.');
  });
});
