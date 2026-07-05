import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { MoneyInput } from './MoneyInput';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { useCreateArticuloMutation, useUpdateArticuloMutation } from '../api/mutations/inventario.mutations';
import type { Articulo, ArticuloCreate, ArticuloUpdate } from '../types';

const opt = z.union([z.number().min(0), z.nan(), z.literal('')]).optional();

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
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
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      nombre: editing?.nombre ?? '',
      sku: editing?.sku ?? '',
      descripcion: editing?.descripcion ?? '',
      precio: editing?.precio ?? ('' as unknown as number),
      costo: editing?.costo ?? '',
      stock: editing?.stock ?? '',
      stockMinimo: editing?.stockMinimo ?? '',
    });
  }, [isOpen, editing, reset]);

  const onSubmit = async (data: FormData) => {
    const base: ArticuloCreate = {
      nombre: data.nombre,
      sku: str(data.sku),
      descripcion: str(data.descripcion),
      precio: data.precio,
      costo: num(data.costo),
      stockMinimo: num(data.stockMinimo),
    };

    if (editing) {
      // El stock no se cambia con PUT (se mueve con ajustes)
      const payload: ArticuloUpdate = { id: editing.id, ...base };
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync({ ...base, stock: num(data.stock) });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar artículo' : 'Nuevo artículo'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio venta" required error={errors.precio?.message} htmlFor="precio">
            <Controller
              control={control}
              name="precio"
              render={({ field }) => (
                <MoneyInput id="precio" value={field.value} onChange={field.onChange} hasError={!!errors.precio} />
              )}
            />
          </FormField>
          <FormField label="Costo" error={errors.costo?.message} htmlFor="costo">
            <Controller
              control={control}
              name="costo"
              render={({ field }) => (
                <MoneyInput id="costo" value={field.value} onChange={field.onChange} hasError={!!errors.costo} />
              )}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear artículo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
