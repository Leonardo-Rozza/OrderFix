import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { MoneyInput } from './MoneyInput';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { METODOS } from '../config/cobros';
import { formatMoney } from '../utils/format';
import { useCrearCobroMutation } from '../api/mutations/cobros.mutations';
import type { CobroCreate } from '../types';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { getApiErrorBody } from '../api/errors';

const schema = z.object({
  monto: z.number({ message: 'El monto es requerido' }).positive('Debe ser mayor a 0'),
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

export const CobroFormModal = ({
  isOpen,
  onClose,
  reparacionId,
  saldo,
  excedente = 0,
  requiereRevision = false,
}: Props) => {
  const crear = useCrearCobroMutation(reparacionId);
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
  const cobroBloqueado = requiereRevision || sinPendiente;

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
      reset({
        monto: saldo && saldo > 0 ? saldo : ('' as unknown as number),
        metodo: 'EFECTIVO',
        referencia: '',
        observaciones: '',
      });
    }
    if (isOpen) activeReparacionIdRef.current = reparacionId;
    wasOpenRef.current = isOpen;
  }, [isOpen, reparacionId, saldo, reset]);

  const onSubmit = async (data: FormData, commitAndClose: () => void) => {
    if (cobroBloqueado) return;
    if (pendienteCobro != null && data.monto > pendienteCobro) {
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
    try {
      await crear.mutateAsync(payload);
    } catch (error) {
      const apiError = getApiErrorBody(error);
      if (apiError?.code === 'COBRO_SUPERA_SALDO') {
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
              <button type="submit" form="cobro-form" className={btnPrimary} disabled={crear.isPending || cobroBloqueado}>
                {crear.isPending ? 'Guardando…' : 'Registrar cobro'}
              </button>
            </FormActions>
          )}
        >
          <p className="mb-4 text-[13px] leading-relaxed text-text-2">
            Registrá un pago que el taller ya recibió por fuera de OrdenFix. Esta carga no procesa ni verifica el pago.
          </p>
          <form
            id="cobro-form"
            onSubmit={handleSubmit((data) => onSubmit(data, commitAndClose))}
            aria-busy={crear.isPending}
          >
            <fieldset disabled={crear.isPending || cobroBloqueado} className="m-0 min-w-0 space-y-4 border-0 p-0">
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
              <select id="metodo" {...register('metodo')} className={inputClass(!!errors.metodo)}>
                {METODOS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
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
