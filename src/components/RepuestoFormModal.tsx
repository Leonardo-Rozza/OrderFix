import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { FormField } from './FormField';
import { AsyncCombobox, type AsyncComboboxOption } from './AsyncCombobox';
import { MoneyInput } from './MoneyInput';
import { inputClass, btnGhost, btnPrimary } from './ui';
import {
  useCreateRepuestoMutation,
  useUpdateRepuestoMutation,
} from '../api/mutations/repuestos.mutations';
import {
  inventarioOptionsSource,
  type ArticuloOptionMeta,
} from '../api/queries/inventario.queries';
import { reparacionesOptionsSource } from '../api/queries/reparacion-options.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';
import type { Repuesto, RepuestoCreate, RepuestoUpdate } from '../types';

const schema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional().or(z.literal('')),
  precio: z.number({ message: 'El precio es requerido' }).min(0, 'Mínimo 0'),
  reparacionId: z.union([z.number(), z.nan(), z.literal('')]).optional(),
  articuloId: z.union([z.number(), z.nan(), z.literal('')]).optional(),
  cantidad: z.union([z.number(), z.nan(), z.literal('')]).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: Repuesto | null;
  /** Si viene, el repuesto queda asociado a esa reparación y se oculta el selector. */
  lockedReparacionId?: number;
}

const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);
const numOpt = (v: number | '' | undefined): number | undefined =>
  v === '' || v === undefined || Number.isNaN(v) ? undefined : v;

export const RepuestoFormModal = ({
  isOpen,
  onClose,
  editing,
  lockedReparacionId,
}: Props) => {
  const createMutation = useCreateRepuestoMutation();
  const updateMutation = useUpdateRepuestoMutation();
  // El inventario solo se ofrece al crear y si el plan lo habilita (PRO).
  const { inventario } = useFunciones();
  const saving = createMutation.isPending || updateMutation.isPending;
  const selectedReparacion: AsyncComboboxOption | undefined = editing?.reparacionId
    ? {
        value: editing.reparacionId,
        label: `Orden #${editing.reparacionId}`,
        sublabel: editing.reparacionEquipo?.trim() || 'Asociación actual',
      }
    : undefined;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const articuloId = watch('articuloId');
  const usaInventario = !editing && !!numOpt(articuloId);

  useEffect(() => {
    if (!isOpen) return;
    reset({
      nombre: editing?.nombre ?? '',
      descripcion: editing?.descripcion ?? '',
      precio: editing?.precio ?? ('' as unknown as number),
      reparacionId: editing?.reparacionId ?? lockedReparacionId ?? '',
      articuloId: '',
      cantidad: '',
    });
  }, [isOpen, editing, lockedReparacionId, reset]);

  const onSubmit = async (data: FormData) => {
    const artId = editing ? undefined : numOpt(data.articuloId);
    const base: RepuestoCreate = {
      nombre: data.nombre.trim(),
      precio: data.precio,
      descripcion: str(data.descripcion),
      reparacionId: lockedReparacionId ?? numOpt(data.reparacionId),
      articuloId: artId,
      cantidad: artId ? (numOpt(data.cantidad) ?? 1) : undefined,
    };

    if (editing) {
      const payload: RepuestoUpdate = { id: editing.id, ...base };
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(base);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Editar repuesto' : 'Nuevo repuesto'}
      size="md"
      preventClose={saving}
      footer={(
        <FormActions>
          <button type="button" className={btnGhost} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="repuesto-form" className={btnPrimary} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear repuesto'}
          </button>
        </FormActions>
      )}
    >
      <form id="repuesto-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tomar del inventario (solo al crear) → descuenta stock */}
        {!editing && inventario ? (
          <FormField label="Artículo del inventario (opcional)" htmlFor="articuloId">
            {(accessibility) => (
              <Controller
                control={control}
                name="articuloId"
                render={({ field }) => (
                  <AsyncCombobox<number, ArticuloOptionMeta>
                    ref={field.ref}
                    source={inventarioOptionsSource}
                    id="articuloId"
                    name={field.name}
                    enabled={isOpen}
                    disabled={saving}
                    value={typeof field.value === 'number' && !Number.isNaN(field.value) ? field.value : undefined}
                    emptyLabel="Cargar a mano (sin descontar stock)"
                    placeholder="Cargar a mano (sin descontar stock)"
                    searchPlaceholder="Buscar por nombre o SKU…"
                    searchAriaLabel="Buscar artículo del inventario"
                    entityName="artículo"
                    entityNamePlural="artículos"
                    errorMessage="No pudimos cargar el inventario. Podés continuar a mano."
                    aria-describedby={accessibility['aria-describedby']}
                    onBlur={field.onBlur}
                    onChange={(v, option) => {
                      field.onChange(v ?? '');
                      if (option?.meta) {
                        setValue('nombre', option.meta.nombre, { shouldDirty: true, shouldValidate: true });
                        setValue('precio', option.meta.precio, { shouldDirty: true, shouldValidate: true });
                        setValue('cantidad', 1, { shouldDirty: true });
                      }
                    }}
                  />
                )}
              />
            )}
          </FormField>
        ) : null}

        <FormField label="Nombre" required error={errors.nombre?.message} htmlFor="nombre">
          <input id="nombre" type="text" {...register('nombre')} className={inputClass(!!errors.nombre)} placeholder="Ej: Módulo de pantalla" />
        </FormField>

        <FormField label="Descripción" error={errors.descripcion?.message} htmlFor="descripcion">
          <textarea
            id="descripcion"
            rows={2}
            {...register('descripcion')}
            className={`${inputClass(!!errors.descripcion)} resize-none`}
            placeholder="Detalle opcional (calidad, origen…)"
          />
        </FormField>

        <div className={`grid grid-cols-1 gap-4 ${usaInventario ? 'sm:grid-cols-2' : ''}`}>
          <FormField label="Precio" required error={errors.precio?.message} htmlFor="precio">
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
          {usaInventario && (
            <FormField label="Cantidad (descuenta stock)" htmlFor="cantidad">
              <input id="cantidad" type="number" step="1" min="1" {...register('cantidad', { valueAsNumber: true })} className={inputClass()} placeholder="1" />
            </FormField>
          )}
        </div>

        {/* Selector de reparación solo si no viene fijada */}
        {lockedReparacionId === undefined ? (
          <FormField label="Reparación asociada" error={errors.reparacionId?.message} htmlFor="reparacionId">
            {(accessibility) => (
              <Controller
                control={control}
                name="reparacionId"
                render={({ field }) => (
                  <AsyncCombobox
                    key={editing?.id ?? 'new'}
                    ref={field.ref}
                    source={reparacionesOptionsSource}
                    id="reparacionId"
                    name={field.name}
                    enabled={isOpen}
                    disabled={saving}
                    value={typeof field.value === 'number' && !Number.isNaN(field.value) ? field.value : undefined}
                    selectedOption={selectedReparacion}
                    emptyLabel="Sin asociar"
                    placeholder="Sin asociar"
                    searchPlaceholder="Buscar por orden, equipo o cliente…"
                    searchAriaLabel="Buscar reparación"
                    entityName="reparación"
                    entityNamePlural="reparaciones"
                    partialEmptyMessage="No hay órdenes abiertas entre las cargadas."
                    errorMessage="No pudimos cargar las reparaciones. Podés dejar el repuesto sin asociar."
                    hasError={!!errors.reparacionId}
                    aria-invalid={accessibility['aria-invalid']}
                    aria-describedby={accessibility['aria-describedby']}
                    onBlur={field.onBlur}
                    onChange={(value) => field.onChange(value ?? '')}
                  />
                )}
              />
            )}
          </FormField>
        ) : null}

      </form>
    </Modal>
  );
};
