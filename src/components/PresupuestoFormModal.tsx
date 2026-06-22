import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { formatMoney } from '../utils/format';
import { useCrearPresupuestoMutation } from '../api/mutations/presupuestos.mutations';

const schema = z.object({
  items: z
    .array(
      z.object({
        descripcion: z.string().min(1, 'Requerido'),
        cantidad: z.number({ message: 'Cant.' }).min(1, 'Mín. 1'),
        precioUnitario: z.number({ message: 'Precio' }).min(0, 'Mín. 0'),
      })
    )
    .min(1, 'Agregá al menos un ítem'),
  observaciones: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reparacionId: number;
}

const filaVacia = { descripcion: '', cantidad: 1, precioUnitario: 0 };

export const PresupuestoFormModal = ({ isOpen, onClose, reparacionId }: Props) => {
  const crear = useCrearPresupuestoMutation(reparacionId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { items: [filaVacia], observaciones: '' } });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (isOpen) reset({ items: [filaVacia], observaciones: '' });
  }, [isOpen, reset]);

  const items = watch('items');
  const total = (items ?? []).reduce((acc, it) => {
    const c = Number(it?.cantidad);
    const p = Number(it?.precioUnitario);
    return acc + (Number.isFinite(c) && Number.isFinite(p) ? c * p : 0);
  }, 0);

  const onSubmit = async (data: FormData) => {
    await crear.mutateAsync({ reparacionId, items: data.items, observaciones: data.observaciones?.trim() || undefined });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo presupuesto" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-1 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
            <div className="flex-1">Detalle</div>
            <div className="w-[64px] text-center">Cant.</div>
            <div className="w-[110px] text-right">Precio unit.</div>
            <div className="w-7" />
          </div>

          {fields.map((field, i) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <input
                  {...register(`items.${i}.descripcion`)}
                  className={inputClass(!!errors.items?.[i]?.descripcion)}
                  placeholder="Ej: Pin de carga"
                />
              </div>
              <input
                type="number"
                min="1"
                step="1"
                {...register(`items.${i}.cantidad`, { valueAsNumber: true })}
                className={`w-[64px] ${inputClass(!!errors.items?.[i]?.cantidad)}`}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                {...register(`items.${i}.precioUnitario`, { valueAsNumber: true })}
                className={`w-[110px] ${inputClass(!!errors.items?.[i]?.precioUnitario)}`}
                placeholder="0"
              />
              <button
                type="button"
                onClick={() => fields.length > 1 && remove(i)}
                disabled={fields.length === 1}
                className="mt-1.5 grid h-7 w-7 place-items-center rounded-lg text-text-3 transition hover:text-danger disabled:opacity-30"
                aria-label="Quitar ítem"
                title="Quitar ítem"
              >
                <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {errors.items?.message && <p className="text-[12.5px] text-danger-fg">{errors.items.message}</p>}

          <button
            type="button"
            onClick={() => append(filaVacia)}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline"
          >
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Agregar ítem
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-[14px] font-extrabold">Total</span>
          <span className="font-mono text-[18px] font-extrabold text-primary">{formatMoney(total)}</span>
        </div>

        <FormField label="Observaciones" error={errors.observaciones?.message} htmlFor="observaciones">
          <textarea id="observaciones" rows={2} {...register('observaciones')} className={`${inputClass()} resize-none`} placeholder="Ej: demora 48hs, garantía 30 días…" />
        </FormField>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={crear.isPending}>
            {crear.isPending ? 'Enviando…' : 'Crear presupuesto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
