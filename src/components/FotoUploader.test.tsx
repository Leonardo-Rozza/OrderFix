import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FotoUploader } from './FotoUploader';

const file = (name = 'local.jpg', type = 'image/jpeg') => new File(['foto'], name, { type });
const Harness = () => {
  const [files, setFiles] = useState<File[]>([]);
  return <FotoUploader id="fotos" value={files} onChange={setFiles} />;
};
beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:local-preview'), revokeObjectURL: vi.fn() }));
});
afterEach(() => vi.unstubAllGlobals());

describe('FotoUploader — selección local', () => {
  it('seleccionar, quitar y desmontar no transmite archivos ni metadatos y revoca el preview', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    const { container, unmount } = render(<Harness />);
    fireEvent.change(container.querySelector('input')!, { target: { files: [file()] } });
    expect(screen.getByAltText('Foto local 1')).toHaveAttribute('src', 'blob:local-preview');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Quitar foto 1' })).toHaveClass('h-11', 'w-11');
    await user.click(screen.getByRole('button', { name: 'Quitar foto 1' }));
    expect(screen.queryByAltText('Foto local 1')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview');
    fireEvent.change(container.querySelector('input')!, { target: { files: [file()] } });
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it.each(['image/svg+xml', 'image/webp', 'text/plain'])('rechaza %s sin conservar la selección ni filtrar nombres', (type) => {
    const change = vi.fn();
    const { container } = render(<FotoUploader id="fotos" onChange={change} />);
    fireEvent.change(container.querySelector('input')!, { target: { files: [file('secret-name', type)] } });
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('JPEG o PNG');
    expect(screen.getByRole('alert')).not.toHaveTextContent('secret-name');
  });
  it('rechaza un lote con archivo vacío o demasiado grande y mantiene las fotos previas', () => {
    const change = vi.fn();
    const previous = file();
    const { container } = render(<FotoUploader id="fotos" value={[previous]} onChange={change} />);
    const large = file();
    Object.defineProperty(large, 'size', { value: 8_000_001 });
    for (const invalid of [new File([], 'empty.png', { type: 'image/png' }), large]) {
      fireEvent.change(container.querySelector('input')!, { target: { files: [file(), invalid] } });
      expect(change).not.toHaveBeenCalled();
      expect(screen.getByAltText('Foto local 1')).toBeVisible();
    }
  });
  it('respeta disabled también ante un evento directo del input', () => {
    const change = vi.fn();
    const { container } = render(<FotoUploader id="fotos" value={[file()]} onChange={change} disabled />);
    fireEvent.change(container.querySelector('input')!, { target: { files: [file()] } });
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Quitar foto 1' })).toBeDisabled();
  });
});
