import { useEffect, useRef } from 'react';
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

const schema = z.object({
  monto: z.number({ message: 'El monto es requerido' }).positive('Debe ser mayor a 0'),
  metodo: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MERCADOPAGO', 'OTRO']),
  observaciones: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reparacionId: number;
  /** Saldo pendiente, para sugerir el monto. */
  saldo?: number;
}

export const CobroFormModal = ({ isOpen, onClose, reparacionId, saldo }: Props) => {
  const crear = useCrearCobroMutation(reparacionId);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { metodo: 'EFECTIVO' } });
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      reset({
        monto: saldo && saldo > 0 ? saldo : ('' as unknown as number),
        metodo: 'EFECTIVO',
        observaciones: '',
      });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, saldo, reset]);

  const onSubmit = async (data: FormData, commitAndClose: () => void) => {
    const payload: CobroCreate = {
      monto: data.monto,
      metodo: data.metodo,
      observaciones: data.observaciones?.trim() || undefined,
    };
    try {
      await crear.mutateAsync(payload);
    } catch {
      // La mutación muestra el error; el formulario y su guard quedan activos.
      return;
    }
    commitAndClose();
  };

  return (
    <UnsavedChangesGuard
      isOpen={isOpen}
      isDirty={isDirty}
      isBusy={crear.isPending}
      onClose={onClose}
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
              <button type="submit" form="cobro-form" className={btnPrimary} disabled={crear.isPending}>
                {crear.isPending ? 'Guardando…' : 'Registrar cobro'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="cobro-form"
            onSubmit={handleSubmit((data) => onSubmit(data, commitAndClose))}
            className="space-y-4"
          >
            {saldo != null && saldo > 0 && (
              <div className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-text-2">
                Saldo pendiente: <span className="font-mono font-bold text-text">{formatMoney(saldo)}</span>
              </div>
            )}
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
                      onChange={field.onChange}
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
            <FormField label="Observaciones" error={errors.observaciones?.message} htmlFor="observaciones">
              <input id="observaciones" type="text" {...register('observaciones')} className={inputClass()} placeholder="Ej: seña, saldo…" />
            </FormField>

          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
