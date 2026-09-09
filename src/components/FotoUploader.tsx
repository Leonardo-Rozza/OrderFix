import { useRef, useState } from 'react';
import { validatePhotoFile } from '../api/repairPhotos';
import { BlobImage } from './BlobImage';

interface FotoUploaderProps {
  id: string;
  value?: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** Seleccionar o quitar archivos sólo afecta memoria local: no transmite metadatos ni bytes. */
export const FotoUploader = ({ id, value = [], onChange, disabled = false }: FotoUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((file, index) => (
          <div key={`${file.name}-${index}`} className="relative h-20 w-20">
            <BlobImage blob={file} alt={`Foto local ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" />
            <button type="button" disabled={disabled} aria-label={`Quitar foto ${index + 1}`} title="Quitar foto"
              className="absolute right-0 top-0 h-11 w-11 rounded-full bg-surface text-text disabled:opacity-50"
              onClick={() => onChange(value.filter((_, current) => current !== index))}>×</button>
          </div>
        ))}
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}
          aria-label="Agregar fotos" className="h-16 min-w-16 rounded-lg border border-dashed border-border px-2 disabled:opacity-50">+</button>
      </div>
      <input ref={inputRef} id={id} type="file" accept="image/jpeg,image/png" multiple disabled={disabled}
        className="sr-only" tabIndex={-1} onChange={(event) => {
          if (disabled) return;
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          setError(null);
          try {
            files.forEach(validatePhotoFile);
            onChange([...value, ...files]);
          } catch {
            setError('Elegí imágenes JPEG o PNG de hasta 8 MB cada una.');
          }
        }} />
      <p className="text-xs text-text-3">Selección local. Revisarás la autorización de esta orden antes de enviar las fotos.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
};
