import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FotoUploader } from './FotoUploader';

const mocks = vi.hoisted(() => ({
  showError: vi.fn(),
  subirFoto: vi.fn(),
}));

vi.mock('../lib/cloudinary', () => ({
  FotoInvalidaError: class FotoInvalidaError extends Error {},
  subirFoto: mocks.subirFoto,
}));

vi.mock('../utils/toast', () => ({ showError: mocks.showError }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
};

const Harness = ({
  initial = [],
  onChange,
  onUploadingChange,
}: {
  initial?: string[];
  onChange?: (urls: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <FotoUploader
      id="fotos"
      value={value}
      onChange={(urls) => {
        setValue(urls);
        onChange?.(urls);
      }}
      onUploadingChange={onUploadingChange}
    />
  );
};

describe('FotoUploader', () => {
  beforeEach(() => {
    mocks.showError.mockReset();
    mocks.subirFoto.mockReset();
  });

  it('conserva la lista más reciente si se quita una foto durante una subida', async () => {
    const user = userEvent.setup();
    const upload = deferred<string>();
    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    mocks.subirFoto.mockReturnValueOnce(upload.promise);
    const { container } = render(
      <Harness initial={['https://img/old.jpg']} onChange={onChange} onUploadingChange={onUploadingChange} />,
    );

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [new File(['foto'], 'nueva.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => expect(onUploadingChange).toHaveBeenLastCalledWith(true));

    await user.click(screen.getByRole('button', { name: 'Quitar foto 1' }));
    expect(screen.queryByAltText('Foto subida 1')).not.toBeInTheDocument();

    await act(async () => upload.resolve('https://img/new.jpg'));
    await waitFor(() => expect(screen.getByAltText('Foto subida 1')).toHaveAttribute('src', 'https://img/new.jpg'));
    expect(onChange).toHaveBeenLastCalledWith(['https://img/new.jpg']);
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  });

  it('acumula un lote secuencial sin perder la URL de la subida anterior', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const onChange = vi.fn();
    mocks.subirFoto.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { container } = render(<Harness onChange={onChange} />);

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [
          new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
          new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
        ],
      },
    });
    await act(async () => first.resolve('https://img/a.jpg'));
    await act(async () => second.resolve('https://img/b.jpg'));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(['https://img/a.jpg', 'https://img/b.jpg']));
  });

  it('deshabilita todas las mutaciones externas y mantiene un target táctil para quitar', () => {
    const { rerender } = render(
      <FotoUploader id="fotos" value={['https://img/a.jpg']} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Quitar foto 1' })).toHaveClass('h-11', 'w-11');

    rerender(<FotoUploader id="fotos" value={['https://img/a.jpg']} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Quitar foto 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeDisabled();
  });
});
