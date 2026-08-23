import { useId, useRef, useState } from 'react';
import { BlobImage } from './BlobImage';
import { btnGhost } from './ui';

const QR_COBRO_MAX_BYTES = 1024 * 1024;
const QR_COBRO_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const QR_COBRO_EXTENSION = /\.(?:png|jpe?g)$/i;

export interface QrCobroDraft {
  file: File | null;
  removeExisting: boolean;
}

interface Props {
  id: string;
  hasCurrent?: boolean;
  currentBlob?: Blob | null;
  currentLoading?: boolean;
  currentError?: boolean;
  onRetryCurrent?: () => void;
  value: QrCobroDraft;
  onChange: (value: QrCobroDraft) => void;
  disabled?: boolean;
  progress?: number | null;
  error?: string | null;
}

const validateQrCobroFile = (file: File): string | null => {
  const hasSupportedFormat = file.type
    ? QR_COBRO_MIME.has(file.type.toLowerCase())
    : QR_COBRO_EXTENSION.test(file.name);
  if (!hasSupportedFormat) return 'Elegí una imagen PNG o JPEG.';
  if (file.size === 0) return 'La imagen está vacía.';
  if (file.size > QR_COBRO_MAX_BYTES) return 'La imagen no puede superar 1 MiB.';
  return null;
};

export const QrCobroUploader = ({
  id,
  hasCurrent = false,
  currentBlob,
  currentLoading = false,
  currentError = false,
  onRetryCurrent,
  value,
  onChange,
  disabled = false,
  progress = null,
  error,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [localError, setLocalError] = useState<string | null>(null);
  const visibleError = localError ?? error;
  const imageBlob = value.file ?? (!value.removeExisting ? currentBlob : null);
  const hasExisting = hasCurrent || !!currentBlob;

  const selectFile = (file: File | undefined) => {
    if (!file || disabled) return;
    const validation = validateQrCobroFile(file);
    if (validation) {
      setLocalError(validation);
      // La última intención es la inválida: no conservamos silenciosamente un
      // draft anterior que luego podría subirse con un mensaje contradictorio.
      onChange({ file: null, removeExisting: false });
      return;
    }
    setLocalError(null);
    onChange({ file, removeExisting: false });
  };

  const clearSelection = () => {
    setLocalError(null);
    onChange({ file: null, removeExisting: false });
  };

  return (
    <div className="min-w-0 space-y-3" aria-busy={disabled}>
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:flex-row sm:items-center">
        <div className="grid h-32 w-full shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface sm:h-28 sm:w-28">
          {imageBlob ? (
            <BlobImage
              blob={imageBlob}
              alt={value.file ? 'Vista previa del nuevo QR de cobro' : 'QR de cobro configurado por el taller'}
              className="h-full w-full object-contain p-2"
            />
          ) : currentLoading && !value.removeExisting ? (
            <span
              className="grid h-6 w-6 place-items-center"
              role="status"
              aria-live="polite"
              aria-label="Cargando QR configurado"
            >
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-surface-3 border-t-primary" aria-hidden="true" />
              <span className="sr-only">Cargando QR configurado…</span>
            </span>
          ) : currentError && !value.removeExisting ? (
            <div role="alert" className="px-2 text-center text-[12px] font-semibold text-danger-fg">
              No pudimos cargar el QR.
            </div>
          ) : (
            <div className="px-3 text-center text-[12px] font-semibold text-text-3">
              {value.removeExisting ? 'El QR se eliminará al guardar.' : 'Sin QR configurado'}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {value.file ? (
            <p className="[overflow-wrap:anywhere] text-[12.5px] font-semibold text-text-2">
              Nuevo archivo: {value.file.name}
            </p>
          ) : null}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className={btnGhost}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-describedby={visibleError ? errorId : undefined}
            >
              {imageBlob || hasExisting ? 'Reemplazar QR' : 'Seleccionar QR'}
            </button>
            {value.file ? (
              <button type="button" className={btnGhost} onClick={clearSelection} disabled={disabled}>
                Quitar selección
              </button>
            ) : hasCurrent && !value.removeExisting ? (
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setLocalError(null);
                  onChange({ file: null, removeExisting: true });
                }}
                disabled={disabled}
              >
                Eliminar QR
              </button>
            ) : value.removeExisting ? (
              <button type="button" className={btnGhost} onClick={clearSelection} disabled={disabled}>
                Deshacer eliminación
              </button>
            ) : null}
            {currentError && !value.removeExisting && onRetryCurrent ? (
              <button type="button" className={btnGhost} onClick={onRetryCurrent} disabled={disabled}>
                Reintentar vista previa
              </button>
            ) : null}
          </div>
          <p className="text-[12px] text-text-3">
            PNG o JPEG · máximo 1 MiB, 1024 × 1024 px por lado y 1 megapíxel total.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          // Permite reintentar exactamente el mismo archivo tras validación o error de red.
          event.currentTarget.value = '';
          selectFile(file);
        }}
      />

      {progress != null ? (
        <div className="space-y-1" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-[12px] font-semibold text-text-2">
            <span>Subiendo QR…</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso de subida del QR"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-surface-3"
          >
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {visibleError ? (
        <p id={errorId} role="alert" className="text-[12.5px] font-semibold text-danger-fg">
          {visibleError}
        </p>
      ) : null}
    </div>
  );
};
