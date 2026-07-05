import { useRef, useState } from 'react';
import { subirFoto, FotoInvalidaError } from '../lib/cloudinary';
import { showError } from '../utils/toast';

interface FotoUploaderProps {
  id: string;
  /** URLs ya subidas (el form las convierte a Foto[] con su momento al guardar). */
  value?: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

/**
 * Selector + subida de fotos a Cloudinary con miniaturas y quitar.
 * Sube secuencialmente y va agregando cada URL apenas está lista, así una
 * foto que falla no tira las demás.
 */
export const FotoUploader = ({ id, value = [], onChange, disabled }: FotoUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(0);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const seleccion = Array.from(files);
    // Permite volver a elegir el mismo archivo si se quitó y se re-agrega.
    if (inputRef.current) inputRef.current.value = '';

    setSubiendo((n) => n + seleccion.length);
    let urls = value;
    for (const file of seleccion) {
      try {
        const url = await subirFoto(file);
        urls = [...urls, url];
        onChange(urls);
      } catch (e) {
        showError(e instanceof FotoInvalidaError || e instanceof Error ? e.message : 'No se pudo subir la foto.');
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  };

  const quitar = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((url) => (
        <div key={url} className="group relative">
          <a href={url} target="_blank" rel="noreferrer" className="block">
            <img src={url} alt="Foto subida" className="h-16 w-16 rounded-lg border border-border object-cover" />
          </a>
          <button
            type="button"
            aria-label="Quitar foto"
            title="Quitar foto"
            onClick={() => quitar(url)}
            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-border-strong bg-surface text-text-2 shadow-sm transition hover:border-danger hover:text-danger"
          >
            <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {Array.from({ length: subiendo }).map((_, i) => (
        <div key={`up-${i}`} className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-border">
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-surface-3 border-t-primary" />
        </div>
      ))}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || subiendo > 0}
        className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-border-strong text-text-3 transition hover:border-primary hover:text-primary disabled:opacity-50"
        aria-label="Agregar fotos"
        title="Agregar fotos"
      >
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
};
