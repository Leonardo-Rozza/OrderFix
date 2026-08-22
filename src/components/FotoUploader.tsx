import { useEffect, useRef, useState } from 'react';
import { subirFoto, FotoInvalidaError } from '../lib/cloudinary';
import { showError } from '../utils/toast';

interface FotoUploaderProps {
  id: string;
  /** URLs ya subidas (el form las convierte a Foto[] con su momento al guardar). */
  value?: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  /** Informa al formulario si hay subidas pendientes para bloquear su envío/cierre. */
  onUploadingChange?: (uploading: boolean) => void;
}

/**
 * Selector + subida de fotos a Cloudinary con miniaturas y quitar.
 * Sube secuencialmente y va agregando cada URL apenas está lista, así una
 * foto que falla no tira las demás.
 */
export const FotoUploader = ({
  id,
  value = [],
  onChange,
  disabled = false,
  onUploadingChange,
}: FotoUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const latestUrlsRef = useRef(value);
  const uploadingRef = useRef(false);
  const mountedRef = useRef(true);
  const uploadingCallbackRef = useRef(onUploadingChange);
  const [remainingUploads, setRemainingUploads] = useState(0);

  // La referencia evita capturar un `value` viejo entre awaits y también absorbe
  // eliminaciones realizadas mientras el lote actual sigue subiendo.
  useEffect(() => {
    latestUrlsRef.current = value;
  }, [value]);

  useEffect(() => {
    uploadingCallbackRef.current = onUploadingChange;
  }, [onUploadingChange]);

  useEffect(() => {
    uploadingCallbackRef.current?.(remainingUploads > 0);
  }, [remainingUploads]);

  useEffect(
    () => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        uploadingCallbackRef.current?.(false);
      };
    },
    [],
  );

  const emitChange = (urls: string[]) => {
    latestUrlsRef.current = urls;
    onChange(urls);
  };

  const onFiles = async (files: FileList | null) => {
    if (disabled || uploadingRef.current || !files?.length) return;
    const selection = Array.from(files);
    // Permite volver a elegir el mismo archivo si se quitó y se re-agrega.
    if (inputRef.current) inputRef.current.value = '';

    uploadingRef.current = true;
    setRemainingUploads(selection.length);

    for (const file of selection) {
      try {
        const url = await subirFoto(file);
        if (mountedRef.current) emitChange([...latestUrlsRef.current, url]);
      } catch (error) {
        if (mountedRef.current) {
          showError(
            error instanceof FotoInvalidaError || error instanceof Error
              ? error.message
              : 'No se pudo subir la foto.',
          );
        }
      } finally {
        if (mountedRef.current) setRemainingUploads((current) => Math.max(0, current - 1));
      }
    }

    uploadingRef.current = false;
  };

  const remove = (url: string) => {
    if (disabled) return;
    emitChange(latestUrlsRef.current.filter((currentUrl) => currentUrl !== url));
  };

  const uploading = remainingUploads > 0;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2" aria-busy={uploading}>
      {value.map((url, index) => (
        <div key={`${url}-${index}`} className="group relative h-16 w-16 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
          >
            <img src={url} alt={`Foto subida ${index + 1}`} className="h-16 w-16 rounded-lg border border-border object-cover" />
          </a>
          <button
            type="button"
            aria-label={`Quitar foto ${index + 1}`}
            title="Quitar foto"
            onClick={() => remove(url)}
            disabled={disabled}
            className="absolute -right-3 -top-3 grid h-11 w-11 touch-manipulation place-items-center rounded-full text-text-2 transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 sm:-right-2 sm:-top-2 sm:h-8 sm:w-8"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-border-strong bg-surface shadow-sm transition group-hover:border-danger group-hover:text-danger">
              <svg
                viewBox="0 0 24 24"
                width={11}
                height={11}
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </span>
          </button>
        </div>
      ))}

      {Array.from({ length: remainingUploads }).map((_, index) => (
        <div
          key={`upload-${index}`}
          className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-border"
          aria-hidden="true"
        >
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-surface-3 border-t-primary" />
        </div>
      ))}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="grid h-16 w-16 shrink-0 touch-manipulation place-items-center rounded-lg border border-dashed border-border-strong text-text-3 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={uploading ? 'Subiendo fotos' : 'Agregar fotos'}
        title={uploading ? 'Subiendo fotos' : 'Agregar fotos'}
      >
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        multiple
        disabled={disabled || uploading}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void onFiles(event.target.files)}
      />

      {uploading ? (
        <span className="sr-only" role="status" aria-live="polite">
          Subiendo {remainingUploads} {remainingUploads === 1 ? 'foto' : 'fotos'}
        </span>
      ) : null}
    </div>
  );
};
