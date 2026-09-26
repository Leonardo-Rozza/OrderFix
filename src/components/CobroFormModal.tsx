import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { MoneyInput } from './MoneyInput';
import { FormField } from './FormField';
import { Select } from './Select';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { METODOS } from '../config/cobros';
import { formatMoney } from '../utils/format';
import { useCrearCobroMutation } from '../api/mutations/cobros.mutations';
import type { CobroCreate } from '../types';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { authStore, isChargeSessionCurrent } from '../store/auth.store';
import { chargeAccount, chargeGeneration, readPendingCharge, prepareCharge, allowChargeCorrection, clearPendingCharge, type PendingCharge } from '../utils/pendingCharge';
import { getApiErrorBody } from '../api/errors';

const schema = z.object({
  monto: z.number({ message: 'El monto es requerido' }).positive('Debe ser mayor a 0')
    .max(99999999.99, 'El monto admite hasta 8 dígitos enteros')
    .multipleOf(0.01, 'El monto admite hasta 2 decimales'),
  metodo: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MERCADOPAGO', 'OTRO']),
  referencia: z.string().max(120, 'Máximo 120 caracteres').optional(),
  observaciones: z.string().max(255, 'Máximo 255 caracteres').optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reparacionId: number;
  /** Pendiente de cobro vigente, para sugerir y limitar el monto. */
  saldo?: number;
  excedente?: number;
  requiereRevision?: boolean;
}

export const CobroFormModal = (props: Props) => {
  const auth = authStore();
  const account = chargeAccount(auth.token, auth.isAuthenticated);
  return <CobroFormContent key={`${account}:${chargeGeneration()}:${props.reparacionId}`} {...props} account={account} />;
};

const CobroFormContent = ({
  isOpen,
  onClose,
  reparacionId,
  saldo,
  excedente = 0,
  requiereRevision = false,
  account,
}: Props & { account: string | null }) => {
  const crear = useCrearCobroMutation(reparacionId);
  const [attempt, setAttempt] = useState<PendingCharge | null>(null);
  const [storageError, setStorageError] = useState(false);
  const exactRetry = attempt?.phase === 'pending';
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [limiteConflicto, setLimiteConflicto] = useState<{
    reparacionId: number;
    pendiente: number;
    saldoOrigen?: number;
  } | null>(null);
  // El 409 aporta el valor autoritativo de la carrera. Se usa hasta que el
  // refetch cambie el saldo prop; el formulario dirty nunca se reinicia.
  const pendienteCobro = limiteConflicto?.reparacionId === reparacionId
    && saldo === limiteConflicto.saldoOrigen
    ? Math.min(saldo ?? limiteConflicto.pendiente, limiteConflicto.pendiente)
    : saldo;
  const sinPendiente = pendienteCobro != null && pendienteCobro <= 0;
  const cobroBloqueado = storageError || !account || (!exactRetry && (requiereRevision || sinPendiente));

  const {
    register,
    handleSubmit,
    reset,
    control,
    clearErrors,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { metodo: 'EFECTIVO' } });
  const wasOpenRef = useRef(false);
  const activeReparacionIdRef = useRef<number | null>(null);

  useEffect(() => {
    const startsSession = isOpen
      && (!wasOpenRef.current || activeReparacionIdRef.current !== reparacionId);
    if (startsSession) {
      try {
        if (!account) throw new Error('No hay una sesión válida.');
        const saved = readPendingCharge(account, reparacionId);
        setAttempt(saved);
        setStorageError(false);
        reset(saved ? {
          ...saved.payload,
          referencia: saved.payload.referencia ?? '',
          observaciones: saved.payload.observaciones ?? '',
        } : {
          monto: saldo && saldo > 0 ? saldo : ('' as unknown as number),
          metodo: 'EFECTIVO', referencia: '', observaciones: '',
        });
      } catch {
        setStorageError(true);
      }
    }
    if (isOpen) activeReparacionIdRef.current = reparacionId;
    wasOpenRef.current = isOpen;
  }, [isOpen, reparacionId, saldo, reset, account]);

  const onSubmit = async (data: FormData, commitAndClose: () => void) => {
    if (cobroBloqueado || crear.isPending || !account) return;
    if (!exactRetry && pendienteCobro != null && data.monto > pendienteCobro) {
      setError('monto', {
        type: 'maxSaldo',
        message: `El monto no puede superar el pendiente de cobro (${formatMoney(pendienteCobro)}).`,
      }, { shouldFocus: true });
      return;
    }

    const payload: CobroCreate = {
      monto: data.monto,
      metodo: data.metodo,
      referencia: data.referencia?.trim() || undefined,
      observaciones: data.observaciones?.trim() || undefined,
    };
    const session = { account, generation: chargeGeneration() };
    let captured: PendingCharge;
    try {
      captured = prepareCharge(account, reparacionId, payload);
      setAttempt(captured);
    } catch {
      setStorageError(true);
      return;
    }
    try {
      await crear.mutateAsync({ attempt: captured, session });
    } catch (error) {
      if (!mounted.current || !isChargeSessionCurrent(session)) return;
      const apiError = getApiErrorBody(error);
      if (apiError?.code === 'COBRO_SUPERA_SALDO') {
        try {
          allowChargeCorrection(captured);
          setAttempt(readPendingCharge(account, reparacionId));
        } catch {
          setStorageError(true);
          return;
        }
        const pendiente = apiError.details?.pendiente;
        const pendienteActualizado = typeof pendiente === 'number' && Number.isFinite(pendiente)
          ? ` Pendiente actualizado: ${formatMoney(pendiente)}.`
          : '';
        if (typeof pendiente === 'number' && Number.isFinite(pendiente)) {
          setLimiteConflicto({
            reparacionId,
            pendiente: Math.max(0, pendiente),
            saldoOrigen: saldo,
          });
        }
        setError('monto', {
          type: 'server',
          message: `${apiError.message ?? 'El monto supera el pendiente de cobro.'}${pendienteActualizado}`,
        }, { shouldFocus: true });
      }
      // Los errores generales quedan en el toast de la mutación. En ambos casos,
      // el formulario y su guard permanecen activos con todos los valores escritos.
      return;
    }
    if (!mounted.current || !isChargeSessionCurrent(session)) return;
    try {
      clearPendingCharge(captured);
      setAttempt(null);
    } catch {
      setStorageError(true);
      return;
    }
    commitAndClose();
  };

  return (
    <UnsavedChangesGuard
      isOpen={isOpen}
      isDirty={isDirty}
      isBusy={crear.isPending}
      onClose={() => {
        setLimiteConflicto(null);
        onClose();
      }}
    >
      {({ requestClose, commitAndClose, isSuspended }) => (
        <Modal
          isOpen
          onClose={requestClose}
          title="Registrar cobro"
          size="sm"
          preventClose={crear.isPending}
          suspended={isSuspended}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={requestClose} disabled={crear.isPending}>
                Cancelar
              </button>
              <button
                type={exactRetry ? 'button' : 'submit'}
                form="cobro-form"
                className={btnPrimary}
                disabled={crear.isPending || cobroBloqueado}
                onClick={exactRetry ? () => void onSubmit(attempt.payload, commitAndClose) : undefined}
              >
                {crear.isPending ? 'Guardando…' : exactRetry ? 'Reintentar el mismo cobro' : 'Registrar cobro'}
              </button>
            </FormActions>
          )}
        >
          <p className="mb-4 text-[13px] leading-relaxed text-text-2">
            Registrá un pago que el taller ya recibió por fuera de OrdenFix. Esta carga no procesa ni verifica el pago.
          </p>
          {storageError && (
            <p role="alert" className="mb-4 text-[13px] text-danger-fg">
              No se pudo recuperar o conservar el intento de cobro en esta pestaña. No se enviará otro cobro. Revisa el historial antes de continuar; no borres los datos de esta pestaña para reintentar.
            </p>
          )}
          {exactRetry && (
            <p role="status" className="mb-4 text-[13px] text-text-2">
              Hay un cobro pendiente de confirmación. El reintento conserva exactamente los mismos datos, aunque el saldo haya cambiado. Puedes cerrar y volver a abrir en esta pestaña sin perderlo.
            </p>
          )}
          <form
            id="cobro-form"
            onSubmit={handleSubmit((data) => onSubmit(data, commitAndClose))}
            aria-busy={crear.isPending}
          >
            <fieldset disabled={crear.isPending || cobroBloqueado || exactRetry} className="m-0 min-w-0 space-y-4 border-0 p-0">
            {requiereRevision ? (
              <div role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-[13px] font-semibold text-danger-fg">
                Esta orden tiene un excedente a revisar
                {excedente > 0 ? ` de ${formatMoney(excedente)}` : ''}. Corregilo antes de registrar otro cobro.
              </div>
            ) : sinPendiente ? (
              <div role="status" className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] font-semibold text-text-2">
                No hay pendiente de cobro para esta orden.
              </div>
            ) : pendienteCobro != null && pendienteCobro > 0 ? (
              <div className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                Pendiente de cobro: <span className="font-mono font-bold text-text">{formatMoney(pendienteCobro)}</span>
              </div>
            ) : null}
            <FormField label="Monto" required error={errors.monto?.message} htmlFor="monto">
              {(accessibility) => (
                <Controller
                  control={control}
                  name="monto"
                  render={({ field }) => (
                    <MoneyInput
                      ref={field.ref}
                      id="monto"
                      name={field.name}
                      value={field.value}
                      onChange={(value) => {
                        if (errors.monto?.type === 'server' || errors.monto?.type === 'maxSaldo') {
                          clearErrors('monto');
                        }
                        field.onChange(value);
                      }}
                      onBlur={field.onBlur}
                      hasError={!!errors.monto}
                      aria-invalid={accessibility['aria-invalid']}
                      aria-describedby={accessibility['aria-describedby']}
                      aria-required={accessibility['aria-required']}
                    />
                  )}
                />
              )}
            </FormField>
            <FormField label="Método" error={errors.metodo?.message} htmlFor="metodo">
              <Select id="metodo" {...register('metodo')} hasError={!!errors.metodo}>
                {METODOS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Referencia (opcional)" error={errors.referencia?.message} htmlFor="referencia">
              <input
                id="referencia"
                type="text"
                maxLength={120}
                {...register('referencia')}
                className={inputClass(!!errors.referencia)}
                placeholder="Ej: OP-123 o n.º de transferencia"
              />
            </FormField>
            <FormField label="Observaciones internas (opcional)" error={errors.observaciones?.message} htmlFor="observaciones">
              <input id="observaciones" type="text" maxLength={255} {...register('observaciones')} className={inputClass()} placeholder="Ej: seña inicial" />
            </FormField>
            </fieldset>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
