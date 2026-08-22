import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { MoneyInput } from './MoneyInput';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { useCreateArticuloMutation, useUpdateArticuloMutation } from '../api/mutations/inventario.mutations';
import type { Articulo, ArticuloCreate, ArticuloUpdate } from '../types';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';

const opt = z.union([z.number().min(0), z.nan(), z.literal('')]).optional();

const schema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido'),
  sku: z.string().optional(),
  descripcion: z.string().optional(),
  precio: z.number({ message: 'El precio es requerido' }).min(0, 'Mínimo 0'),
  costo: opt,
  stock: opt,
  stockMinimo: opt,
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: Articulo | null;
}

const num = (v: number | '' | undefined): number | undefined =>
  v === '' || v === undefined || Number.isNaN(v) ? undefined : v;
const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);

export const ArticuloFormModal = ({ isOpen, onClose, editing }: Props) => {
  const createMutation = useCreateArticuloMutation();
  const updateMutation = useUpdateArticuloMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      nombre: editing?.nombre ?? '',
      sku: editing?.sku ?? '',
      descripcion: editing?.descripcion ?? '',
      precio: editing?.precio ?? ('' as unknown as number),
      costo: editing?.costo ?? '',
      // Los inputs nativos con `valueAsNumber` representan el vacío como NaN;
      // usar el mismo valor como baseline evita un dirty espurio.
      stock: Number.NaN,
      stockMinimo: editing?.stockMinimo ?? Number.NaN,
    });
  }, [isOpen, editing, reset]);

  const onSubmit = async (data: FormData, commitAndClose: () => void) => {
    const base: ArticuloCreate = {
      nombre: data.nombre.trim(),
      sku: str(data.sku),
      descripcion: str(data.descripcion),
      precio: data.precio,
      costo: num(data.costo),
      stockMinimo: num(data.stockMinimo),
    };

    try {
      if (editing) {
        // El stock no se cambia con PUT (se mueve con ajustes)
        const payload: ArticuloUpdate = { id: editing.id, ...base };
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync({ ...base, stock: num(data.stock) });
      }
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
      isBusy={saving}
      onClose={onClose}
    >
      {({ requestClose, commitAndClose, isSuspended }) => (
        <Modal
          isOpen
          onClose={requestClose}
          title={editing ? 'Editar artículo' : 'Nuevo artículo'}
          size="md"
          preventClose={saving}
          suspended={isSuspended}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={requestClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" form="articulo-form" className={btnPrimary} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear artículo'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="articulo-form"
            onSubmit={handleSubmit((data) => onSubmit(data, commitAndClose))}
            aria-busy={saving}
          >
        <fieldset disabled={saving} className="m-0 min-w-0 space-y-4 border-0 p-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr]">
          <FormField label="Nombre" required error={errors.nombre?.message} htmlFor="nombre">
            <input id="nombre" type="text" {...register('nombre')} className={inputClass(!!errors.nombre)} placeholder="Ej: Pantalla iPhone 11" />
          </FormField>
          <FormField label="SKU" error={errors.sku?.message} htmlFor="sku">
            <input id="sku" type="text" {...register('sku')} className={inputClass(!!errors.sku)} placeholder="PANT-IP11" />
          </FormField>
        </div>

        <FormField label="Descripción" error={errors.descripcion?.message} htmlFor="descripcion">
          <input id="descripcion" type="text" {...register('descripcion')} className={inputClass(!!errors.descripcion)} placeholder="Opcional" />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Precio venta" required error={errors.precio?.message} htmlFor="precio">
            {(accessibility) => (
              <Controller
                control={control}
                name="precio"
                render={({ field }) => (
                  <MoneyInput
                    ref={field.ref}
                    id="precio"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    hasError={!!errors.precio}
                    aria-invalid={accessibility['aria-invalid']}
                    aria-describedby={accessibility['aria-describedby']}
                    aria-required={accessibility['aria-required']}
                  />
                )}
              />
            )}
          </FormField>
          <FormField label="Costo" error={errors.costo?.message} htmlFor="costo">
            {(accessibility) => (
              <Controller
                control={control}
                name="costo"
                render={({ field }) => (
                  <MoneyInput
                    ref={field.ref}
                    id="costo"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    hasError={!!errors.costo}
                    aria-invalid={accessibility['aria-invalid']}
                    aria-describedby={accessibility['aria-describedby']}
                  />
                )}
              />
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editing && (
            <FormField label="Stock inicial" error={errors.stock?.message} htmlFor="stock">
              <input id="stock" type="number" step="1" min="0" {...register('stock', { valueAsNumber: true })} className={inputClass(!!errors.stock)} placeholder="0" />
            </FormField>
          )}
          <FormField label="Stock mínimo" error={errors.stockMinimo?.message} htmlFor="stockMinimo">
            <input id="stockMinimo" type="number" step="1" min="0" {...register('stockMinimo', { valueAsNumber: true })} className={inputClass(!!errors.stockMinimo)} placeholder="0" />
          </FormField>
        </div>
        {editing && (
          <p className="text-[12px] text-text-3">El stock se mueve con ajustes (+/−), no desde acá.</p>
        )}
        </fieldset>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
