import { useEffect } from 'react';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { MoneyInput } from './MoneyInput';
import { formatMoney } from '../utils/format';
import { useCrearPresupuestoMutation } from '../api/mutations/presupuestos.mutations';
import { showError } from '../utils/toast';

const schema = z.object({
  items: z
    .array(
      z.object({
        descripcion: z.string().min(1, 'Escribí el detalle del ítem'),
        cantidad: z.number({ message: 'Cargá la cantidad' }).min(1, 'La cantidad mínima es 1'),
        precioUnitario: z.number({ message: 'Cargá el precio' }).min(0, 'El precio no puede ser negativo'),
        tipoItem: z.enum(['MANO_DE_OBRA', 'REPUESTO']),
        // '' = sin especificar (el backend la acepta solo en repuestos)
        calidad: z.enum(['', 'ORIGINAL', 'ALTERNATIVO', 'USADO_REACONDICIONADO']),
      })
    )
    .min(1, 'Agregá al menos un ítem'),
  observaciones: z.string().optional(),
  tipo: z.enum(['ORIGINAL', 'ADICIONAL']),
  validezDias: z.number({ message: 'Días' }).min(1, 'Mín. 1').max(365, 'Máx. 365'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reparacionId: number;
}

const filaVacia = {
  descripcion: '',
  cantidad: 1,
  // Vacío para que se vea el placeholder y obligue a cargar un precio (0 es válido).
  precioUnitario: '' as unknown as number,
  tipoItem: 'MANO_DE_OBRA' as const,
  calidad: '' as const,
};
const defaults: FormData = { items: [filaVacia], observaciones: '', tipo: 'ORIGINAL', validezDias: 7 };

export const PresupuestoFormModal = ({ isOpen, onClose, reparacionId }: Props) => {
  const crear = useCrearPresupuestoMutation(reparacionId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: defaults });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (isOpen) reset(defaults);
  }, [isOpen, reset]);

  const items = watch('items');
  const subtotal = (filtro: (tipoItem: string) => boolean) =>
    (items ?? []).reduce((acc, it) => {
      const c = Number(it?.cantidad);
      const p = Number(it?.precioUnitario);
      if (!filtro(it?.tipoItem ?? 'MANO_DE_OBRA')) return acc;
      return acc + (Number.isFinite(c) && Number.isFinite(p) ? c * p : 0);
    }, 0);
  const manoDeObra = subtotal((t) => t === 'MANO_DE_OBRA');
  const repuestos = subtotal((t) => t === 'REPUESTO');
  const total = manoDeObra + repuestos;

  const onSubmit = async (data: FormData) => {
    await crear.mutateAsync({
      reparacionId,
      items: data.items.map((it) => ({
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        tipoItem: it.tipoItem,
        calidad: it.tipoItem === 'REPUESTO' && it.calidad ? it.calidad : undefined,
      })),
      observaciones: data.observaciones?.trim() || undefined,
      tipo: data.tipo,
      validezDias: data.validezDias,
    });
    onClose();
  };

  // Los errores de ítems son fáciles de pasar por alto: avisar también por toast.
  const onInvalid = () => showError('Revisá los campos marcados en rojo.');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo presupuesto" size="lg">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Tipo" error={errors.tipo?.message} htmlFor="tipo">
            <select id="tipo" {...register('tipo')} className={inputClass(!!errors.tipo)}>
              <option value="ORIGINAL">Original (primer presupuesto)</option>
              <option value="ADICIONAL">Adicional (trabajo extra)</option>
            </select>
          </FormField>
          <FormField label="Validez (días)" error={errors.validezDias?.message} htmlFor="validezDias">
            <input
              id="validezDias"
              type="number"
              min="1"
              step="1"
              {...register('validezDias', { valueAsNumber: true })}
              className={inputClass(!!errors.validezDias)}
            />
          </FormField>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-1 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
            <div className="min-w-0 flex-1">Detalle</div>
            <div className="w-[64px] shrink-0 text-center">Cant.</div>
            <div className="w-[128px] shrink-0 text-right">Precio unit.</div>
            <div className="w-7 shrink-0" />
          </div>

          {fields.map((field, i) => {
            const esRepuesto = items?.[i]?.tipoItem === 'REPUESTO';
            return (
              <div key={field.id} className="space-y-2 rounded-xl border border-border bg-surface-2 p-2.5">
                <div className="flex items-start gap-2">
                  {/* inputClass trae w-full: los anchos fijos van en wrappers para que no se pisen */}
                  <div className="min-w-0 flex-1">
                    <input
                      maxLength={255}
                      {...register(`items.${i}.descripcion`)}
                      className={inputClass(!!errors.items?.[i]?.descripcion)}
                      placeholder="Ej: Pin de carga"
                    />
                  </div>
                  <div className="w-[64px] shrink-0">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      aria-label="Cantidad"
                      {...register(`items.${i}.cantidad`, { valueAsNumber: true })}
                      className={inputClass(!!errors.items?.[i]?.cantidad)}
                    />
                  </div>
                  <div className="w-[128px] shrink-0">
                    <Controller
                      control={control}
                      name={`items.${i}.precioUnitario`}
                      render={({ field }) => (
                        <MoneyInput
                          value={field.value}
                          onChange={field.onChange}
                          hasError={!!errors.items?.[i]?.precioUnitario}
                        />
                      )}
                    />
                  </div>
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
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Tipo de ítem"
                    {...register(`items.${i}.tipoItem`)}
                    className={`${inputClass()} !py-1.5 text-[13px]`}
                  >
                    <option value="MANO_DE_OBRA">Mano de obra</option>
                    <option value="REPUESTO">Repuesto</option>
                  </select>
                  {esRepuesto && (
                    <select
                      aria-label="Calidad del repuesto"
                      {...register(`items.${i}.calidad`)}
                      className={`${inputClass()} !py-1.5 text-[13px]`}
                    >
                      <option value="">Calidad (opcional)</option>
                      <option value="ORIGINAL">Original</option>
                      <option value="ALTERNATIVO">Alternativo</option>
                      <option value="USADO_REACONDICIONADO">Usado reacondicionado</option>
                    </select>
                  )}
                </div>
                {(errors.items?.[i]?.descripcion || errors.items?.[i]?.cantidad || errors.items?.[i]?.precioUnitario) && (
                  <p role="alert" className="text-[12.5px] font-semibold text-danger-fg">
                    {errors.items?.[i]?.descripcion?.message ??
                      errors.items?.[i]?.cantidad?.message ??
                      errors.items?.[i]?.precioUnitario?.message}
                  </p>
                )}
              </div>
            );
          })}

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

        <div className="space-y-1.5 rounded-xl bg-surface-2 px-4 py-3">
          <div className="flex items-center justify-between text-[13px] text-text-2">
            <span>Mano de obra</span>
            <span className="font-mono font-semibold">{formatMoney(manoDeObra)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] text-text-2">
            <span>Repuestos</span>
            <span className="font-mono font-semibold">{formatMoney(repuestos)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-[14px] font-extrabold">Total</span>
            <span className="font-mono text-[18px] font-extrabold text-primary">{formatMoney(total)}</span>
          </div>
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
