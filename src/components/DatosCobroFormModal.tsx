import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useActualizarDatosCobroMutation,
  useEliminarQrCobroMutation,
  useSubirQrCobroMutation,
} from '../api/mutations/datosCobro.mutations';
import { getApiErrorBody } from '../api/errors';
import { useQrCobroQuery } from '../api/queries/datosCobro.queries';
import type { DatosCobro, DatosCobroUpdate } from '../types';
import { getErrorMessage, showSuccess } from '../utils/toast';
import { FormField } from './FormField';
import { FormActions, Modal } from './Modal';
import { QrCobroUploader, type QrCobroDraft } from './QrCobroUploader';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { btnGhost, btnPrimary, inputClass } from './ui';

const optionalText = (max: number) => z.string().max(max, `Máximo ${max} caracteres`);
const schema = z.object({
  alias: optionalText(120),
  titular: optionalText(160),
  entidad: optionalText(120),
  mostrarEnResumen: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  datos: DatosCobro;
}

const EMPTY_QR_DRAFT: QrCobroDraft = { file: null, removeExisting: false };

const toFormData = (datos: DatosCobro): FormData => ({
  alias: datos.alias ?? '',
  titular: datos.titular ?? '',
  entidad: datos.entidad ?? '',
  mostrarEnResumen: datos.mostrarEnResumen,
});

const normalizeMetadata = (data: FormData): DatosCobroUpdate => ({
  alias: data.alias.trim() || null,
  titular: data.titular.trim() || null,
  entidad: data.entidad.trim() || null,
  mostrarEnResumen: data.mostrarEnResumen,
});

const qrErrorMessage = (error: unknown, action: 'subir' | 'eliminar') => {
  const body = getApiErrorBody(error);
  if (body?.code === 'ARCHIVO_DEMASIADO_GRAN' || (axios.isAxiosError(error) && error.response?.status === 413)) {
    return 'La imagen no puede superar 1 MiB.';
  }
  if (body?.code === 'QR_COBRO_INVALIDO') {
    return body.message ?? 'El archivo no es un QR raster válido. Elegí un PNG o JPEG de hasta 1024 × 1024 px.';
  }
  return getErrorMessage(
    error,
    action === 'subir' ? 'No pudimos guardar el QR.' : 'No pudimos eliminar el QR.',
  );
};

export const DatosCobroFormModal = ({ isOpen, onClose, datos }: Props) => {
  const actualizar = useActualizarDatosCobroMutation();
  const subirQr = useSubirQrCobroMutation();
  const eliminarQr = useEliminarQrCobroMutation();
  const qrActual = useQrCobroQuery(
    datos.qrVersion,
    isOpen && datos.qrDisponible && !!datos.qrVersion,
  );
  const [qrDraft, setQrDraft] = useState<QrCobroDraft>(EMPTY_QR_DRAFT);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [metadataSaved, setMetadataSaved] = useState(false);
  const [qrSaved, setQrSaved] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const wasOpenRef = useRef(false);
  const aliasRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty: metadataDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: toFormData(datos),
  });

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      reset(toFormData(datos));
      setQrDraft(EMPTY_QR_DRAFT);
      setMetadataError(null);
      setQrError(null);
      setMetadataSaved(false);
      setQrSaved(false);
      setUploadProgress(null);
    }
    wasOpenRef.current = isOpen;
  }, [datos, isOpen, reset]);

  const qrDirty = !!qrDraft.file || qrDraft.removeExisting;
  const isBusy = actualizar.isPending || subirQr.isPending || eliminarQr.isPending;
  const isDirty = metadataDirty || qrDirty;

  const resetAndClose = () => {
    reset(toFormData(datos));
    setQrDraft(EMPTY_QR_DRAFT);
    setMetadataError(null);
    setQrError(null);
    setMetadataSaved(false);
    setQrSaved(false);
    setUploadProgress(null);
    onClose();
  };

  const save = async (formData: FormData, commitAndClose: () => void) => {
    const shouldSaveMetadata = metadataDirty;
    const qrOperation = qrDraft;
    const shouldSaveQr = !!qrOperation.file || qrOperation.removeExisting;
    let metadataSucceeded = !shouldSaveMetadata;
    let qrSucceeded = !shouldSaveQr;

    if (shouldSaveMetadata) {
      setMetadataError(null);
      setMetadataSaved(false);
      try {
        const updated = await actualizar.mutateAsync(normalizeMetadata(formData));
        reset(toFormData(updated));
        setMetadataSaved(true);
        showSuccess('Datos para cobrar guardados');
        metadataSucceeded = true;
      } catch (error) {
        setMetadataError(getErrorMessage(error, 'No pudimos guardar los datos para cobrar.'));
      }
    }

    if (shouldSaveQr) {
      setQrError(null);
      setQrSaved(false);
      try {
        if (qrOperation.file) {
          setUploadProgress(0);
          await subirQr.mutateAsync({ file: qrOperation.file, onProgress: setUploadProgress });
          showSuccess('QR de cobro actualizado');
        } else {
          await eliminarQr.mutateAsync();
          showSuccess('QR de cobro eliminado');
        }
        setQrDraft(EMPTY_QR_DRAFT);
        setQrSaved(true);
        qrSucceeded = true;
      } catch (error) {
        setQrError(qrErrorMessage(error, qrOperation.file ? 'subir' : 'eliminar'));
      } finally {
        setUploadProgress(null);
      }
    }

    if (metadataSucceeded && qrSucceeded) commitAndClose();
  };

  const aliasRegistration = register('alias');

  return (
    <UnsavedChangesGuard
      isOpen={isOpen}
      isDirty={isDirty}
      isBusy={isBusy}
      onClose={resetAndClose}
    >
      {({ requestClose, commitAndClose, isSuspended }) => (
        <Modal
          isOpen
          onClose={requestClose}
          title="Configurar datos para cobrar"
          size="md"
          preventClose={isBusy}
          suspended={isSuspended}
          initialFocusRef={aliasRef}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={requestClose} disabled={isBusy}>
                Cancelar
              </button>
              <button
                type="submit"
                form="datos-cobro-form"
                className={btnPrimary}
                disabled={isBusy || !isDirty}
              >
                {isBusy ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="datos-cobro-form"
            onSubmit={handleSubmit((data) => save(data, commitAndClose))}
            aria-busy={isBusy}
            className="space-y-5"
          >
            <p className="rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[12.5px] leading-relaxed text-text-2">
              OrdenFix sólo guarda y muestra estas referencias. No accede a tu cuenta, no consulta saldos y no confirma que un pago se haya acreditado.
            </p>

            <fieldset disabled={isBusy} className="m-0 min-w-0 space-y-4 border-0 p-0">
              <FormField label="Alias" htmlFor="datos-cobro-alias" error={errors.alias?.message}>
                <input
                  {...aliasRegistration}
                  ref={(element) => {
                    aliasRegistration.ref(element);
                    aliasRef.current = element;
                  }}
                  id="datos-cobro-alias"
                  maxLength={120}
                  autoComplete="off"
                  className={inputClass(!!errors.alias)}
                  placeholder="Ej: mitaller.mp"
                  onChange={(event) => {
                    aliasRegistration.onChange(event);
                    setMetadataError(null);
                    setMetadataSaved(false);
                  }}
                />
              </FormField>

              <FormField label="Titular" htmlFor="datos-cobro-titular" error={errors.titular?.message}>
                <input
                  {...register('titular')}
                  id="datos-cobro-titular"
                  maxLength={160}
                  autoComplete="name"
                  className={inputClass(!!errors.titular)}
                  placeholder="Nombre de la persona o razón social"
                  onInput={() => {
                    setMetadataError(null);
                    setMetadataSaved(false);
                  }}
                />
              </FormField>

              <FormField label="Entidad o billetera" htmlFor="datos-cobro-entidad" error={errors.entidad?.message}>
                <input
                  {...register('entidad')}
                  id="datos-cobro-entidad"
                  maxLength={120}
                  autoComplete="organization"
                  className={inputClass(!!errors.entidad)}
                  placeholder="Ej: Mercado Pago"
                  onInput={() => {
                    setMetadataError(null);
                    setMetadataSaved(false);
                  }}
                />
              </FormField>

              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-[13px] font-semibold text-text-2">
                <input
                  type="checkbox"
                  {...register('mostrarEnResumen')}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
                  onInput={() => {
                    setMetadataError(null);
                    setMetadataSaved(false);
                  }}
                />
                <span>Mostrar estos datos cuando una orden tenga pendiente de cobro en el resumen digital.</span>
              </label>
            </fieldset>

            {metadataError ? (
              <p role="alert" className="text-[12.5px] font-semibold text-danger-fg">{metadataError}</p>
            ) : metadataSaved ? (
              <p role="status" className="text-[12.5px] font-semibold text-success">Datos guardados.</p>
            ) : null}

            <div className="border-t border-border pt-5">
              <h3 className="mb-1 text-[13px] font-extrabold text-text">QR de cobro</h3>
              <p className="mb-3 text-[12.5px] text-text-3">
                Usá la imagen QR estática provista por tu banco o billetera.
              </p>
              <QrCobroUploader
                id="datos-cobro-qr"
                hasCurrent={datos.qrDisponible}
                currentBlob={qrActual.data}
                currentLoading={qrActual.isLoading || qrActual.isFetching}
                currentError={qrActual.isError}
                onRetryCurrent={() => void qrActual.refetch()}
                value={qrDraft}
                onChange={(next) => {
                  setQrDraft(next);
                  setQrError(null);
                  setQrSaved(false);
                }}
                disabled={isBusy}
                progress={uploadProgress}
                error={qrError}
              />
              {qrSaved ? (
                <p role="status" className="mt-2 text-[12.5px] font-semibold text-success">QR guardado.</p>
              ) : null}
            </div>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
