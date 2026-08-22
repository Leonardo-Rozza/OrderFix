import { useEffect, type ChangeEvent } from 'react';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { MoneyInput } from './MoneyInput';
import { formatMoney } from '../utils/format';
import { useCrearPresupuestoMutation } from '../api/mutations/presupuestos.mutations';
import { showError } from '../utils/toast';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';

const schema = z.object({
  items: z
    .array(
      z.object({
        descripcion: z.string().trim().min(1, 'Escribí el detalle del ítem'),
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
  validezDias: z.number({ message: 'Días' }).int('Ingresá días enteros').min(1, 'Mín. 1'),
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
    setValue,
    watch,
    formState: { errors, isDirty },
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

  const onSubmit = async (data: FormData, commitAndClose: () => void) => {
    try {
      await crear.mutateAsync({
        items: data.items.map((it) => ({
          descripcion: it.descripcion.trim(),
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
          tipoItem: it.tipoItem,
          calidad: it.tipoItem === 'REPUESTO' && it.calidad ? it.calidad : undefined,
        })),
        observaciones: data.observaciones?.trim() || undefined,
        tipo: data.tipo,
        validezDias: data.validezDias,
      });
    } catch {
      // La mutación muestra el error; el formulario y su guard quedan activos.
      return;
    }
    commitAndClose();
  };

  // Los errores de ítems son fáciles de pasar por alto: avisar también por toast.
  const onInvalid = () => showError('Revisá los campos marcados en rojo.');

  const handleTipoItemChange = (index: number, event: ChangeEvent<HTMLSelectElement>) => {
    if (event.target.value !== 'MANO_DE_OBRA') return;
    setValue(`items.${index}.calidad`, '', { shouldDirty: true });
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
          title="Nuevo presupuesto"
          size="lg"
          preventClose={crear.isPending}
          suspended={isSuspended}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={requestClose} disabled={crear.isPending}>
                Cancelar
              </button>
              <button type="submit" form="presupuesto-form" className={btnPrimary} disabled={crear.isPending}>
                {crear.isPending ? 'Enviando…' : 'Crear presupuesto'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="presupuesto-form"
            onSubmit={handleSubmit((data) => onSubmit(data, commitAndClose), onInvalid)}
          >
            <fieldset
              disabled={crear.isPending}
              aria-busy={crear.isPending}
              className="m-0 min-w-0 space-y-4 border-0 p-0"
            >
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
          <div className="hidden items-center gap-2 px-1 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3 sm:flex">
            <div className="min-w-0 flex-1">Detalle</div>
            <div className="w-[64px] shrink-0 text-center">Cant.</div>
            <div className="w-[128px] shrink-0 text-right">Precio unit.</div>
            <div className="w-11 shrink-0" />
          </div>

          {fields.map((field, i) => {
            const esRepuesto = items?.[i]?.tipoItem === 'REPUESTO';
            return (
              <div key={field.id} className="space-y-2 rounded-xl border border-border bg-surface-2 p-2.5">
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_64px_128px_44px] sm:items-start">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`item-${i}-descripcion`} className="mb-1 block text-[12px] font-bold text-text-2 sm:sr-only">
                      Detalle
                    </label>
                    <input
                      id={`item-${i}-descripcion`}
                      maxLength={255}
                      {...register(`items.${i}.descripcion`)}
                      className={inputClass(!!errors.items?.[i]?.descripcion)}
                      aria-invalid={!!errors.items?.[i]?.descripcion}
                      aria-describedby={errors.items?.[i]?.descripcion ? `item-${i}-descripcion-error` : undefined}
                      aria-required="true"
                      placeholder="Ej: Pin de carga"
                    />
                    {errors.items?.[i]?.descripcion ? (
                      <p id={`item-${i}-descripcion-error`} role="alert" className="mt-1 text-[12px] font-semibold text-danger-fg">
                        {errors.items[i]?.descripcion?.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid min-w-0 grid-cols-[minmax(0,0.75fr)_minmax(0,1.35fr)_44px] items-end gap-2 sm:contents">
                    <div className="min-w-0">
                      <label htmlFor={`item-${i}-cantidad`} className="mb-1 block text-[12px] font-bold text-text-2 sm:sr-only">
                        Cantidad
                      </label>
                      <input
                        id={`item-${i}-cantidad`}
                        type="number"
                        min="1"
                        step="1"
                        {...register(`items.${i}.cantidad`, { valueAsNumber: true })}
                        className={inputClass(!!errors.items?.[i]?.cantidad)}
                        aria-invalid={!!errors.items?.[i]?.cantidad}
                        aria-describedby={errors.items?.[i]?.cantidad ? `item-${i}-cantidad-error` : undefined}
                        aria-required="true"
                      />
                      {errors.items?.[i]?.cantidad ? (
                        <p id={`item-${i}-cantidad-error`} role="alert" className="mt-1 text-[12px] font-semibold text-danger-fg">
                          {errors.items[i]?.cantidad?.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <label htmlFor={`item-${i}-precio`} className="mb-1 block text-[12px] font-bold text-text-2 sm:sr-only">
                        Precio unitario
                      </label>
                      <Controller
                        control={control}
                        name={`items.${i}.precioUnitario`}
                        render={({ field }) => (
                          <MoneyInput
                            ref={field.ref}
                            id={`item-${i}-precio`}
                            name={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            hasError={!!errors.items?.[i]?.precioUnitario}
                            aria-invalid={!!errors.items?.[i]?.precioUnitario}
                            aria-describedby={errors.items?.[i]?.precioUnitario ? `item-${i}-precio-error` : undefined}
                            aria-required
                          />
                        )}
                      />
                      {errors.items?.[i]?.precioUnitario ? (
                        <p id={`item-${i}-precio-error`} role="alert" className="mt-1 text-[12px] font-semibold text-danger-fg">
                          {errors.items[i]?.precioUnitario?.message}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => fields.length > 1 && remove(i)}
                      disabled={fields.length === 1}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-text-3 transition hover:bg-danger-soft hover:text-danger-fg disabled:opacity-30"
                      aria-label="Quitar ítem"
                      title="Quitar ítem"
                    >
                      <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className={`grid grid-cols-1 gap-2 ${esRepuesto ? 'sm:grid-cols-2' : ''}`}>
                  <select
                    aria-label="Tipo de ítem"
                    {...register(`items.${i}.tipoItem`, {
                      onChange: (event) => handleTipoItemChange(i, event),
                    })}
                    className={`${inputClass()} text-base sm:!py-1.5 sm:text-[13px]`}
                  >
                    <option value="MANO_DE_OBRA">Mano de obra</option>
                    <option value="REPUESTO">Repuesto</option>
                  </select>
                  {esRepuesto && (
                    <select
                      aria-label="Calidad del repuesto"
                      {...register(`items.${i}.calidad`)}
                      className={`${inputClass()} text-base sm:!py-1.5 sm:text-[13px]`}
                    >
                      <option value="">Calidad (opcional)</option>
                      <option value="ORIGINAL">Original</option>
                      <option value="ALTERNATIVO">Alternativo</option>
                      <option value="USADO_REACONDICIONADO">Usado reacondicionado</option>
                    </select>
                  )}
                </div>
              </div>
            );
          })}

          {errors.items?.message && <p className="text-[12.5px] text-danger-fg">{errors.items.message}</p>}

          <button
            type="button"
            onClick={() => append(filaVacia)}
            className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:min-h-0 sm:px-0"
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
            </fieldset>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
