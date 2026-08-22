import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { FormField } from './FormField';
import { Combobox } from './Combobox';
import { MoneyInput } from './MoneyInput';
import { inputClass, btnGhost, btnPrimary } from './ui';
import {
  useCreateRepuestoMutation,
  useUpdateRepuestoMutation,
} from '../api/mutations/repuestos.mutations';
import { useArticulosOptions } from '../api/queries/inventario.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';
import { ESTADOS_CERRADOS } from '../config/estados';
import { ordenLabel } from '../utils/reparacion';
import type { Reparacion, Repuesto, RepuestoCreate, RepuestoUpdate } from '../types';

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
  /** Lista de reparaciones para el selector (no hace falta si reparacionId está fijo). */
  reparaciones?: Reparacion[];
  reparacionesLoading?: boolean;
  reparacionesError?: boolean;
  onRetryReparaciones?: () => void;
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
  reparaciones = [],
  reparacionesLoading = false,
  reparacionesError = false,
  onRetryReparaciones,
  lockedReparacionId,
}: Props) => {
  const createMutation = useCreateRepuestoMutation();
  const updateMutation = useUpdateRepuestoMutation();
  // El inventario solo se ofrece al crear y si el plan lo habilita (PRO).
  const { inventario } = useFunciones();
  const {
    data: articulos = [],
    isLoading: articulosLoading,
    isError: articulosError,
    refetch: retryArticulos,
  } = useArticulosOptions(isOpen && !editing && inventario);
  const saving = createMutation.isPending || updateMutation.isPending;
  const necesitaReparaciones = lockedReparacionId === undefined;
  const optionsLoading = (!editing && inventario && articulosLoading)
    || (necesitaReparaciones && reparacionesLoading);
  const optionsError = (!editing && inventario && articulosError)
    || (necesitaReparaciones && reparacionesError);
  const submitBlocked = saving || optionsLoading || optionsError;
  const reparacionesDisponibles = reparaciones.filter(
    (reparacion) => !ESTADOS_CERRADOS.includes(reparacion.estado) || reparacion.id === editing?.reparacionId,
  );

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
    if (optionsLoading || optionsError) return;
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
          <button type="submit" form="repuesto-form" className={btnPrimary} disabled={submitBlocked}>
            {saving
              ? 'Guardando…'
              : optionsLoading
                ? 'Cargando opciones…'
                : optionsError
                  ? 'Reintentá las opciones'
                  : editing
                    ? 'Guardar cambios'
                    : 'Crear repuesto'}
          </button>
        </FormActions>
      )}
    >
      <form id="repuesto-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tomar del inventario (solo al crear) → descuenta stock */}
        {!editing && inventario && articulosLoading ? (
          <p role="status" className="rounded-lg bg-surface-2 px-3 py-2.5 text-[12.5px] text-text-2">
            Cargando artículos del inventario…
          </p>
        ) : null}
        {!editing && inventario && articulosError ? (
          <div role="alert" className="flex flex-col gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[12.5px] font-semibold text-danger-fg sm:flex-row sm:items-center sm:justify-between">
            <span>No pudimos cargar los artículos del inventario.</span>
            <button type="button" className={btnGhost} onClick={() => void retryArticulos()}>
              Reintentar inventario
            </button>
          </div>
        ) : null}
        {!editing && inventario && !articulosLoading && !articulosError && articulos.length === 0 ? (
          <p className="text-[12.5px] text-text-3">No hay artículos de inventario disponibles; podés cargar el repuesto a mano.</p>
        ) : null}
        {!editing && articulos.length > 0 && !articulosLoading && !articulosError && (
          <FormField label="Artículo del inventario (opcional)" htmlFor="articuloId">
            {(accessibility) => (
              <Controller
                control={control}
                name="articuloId"
                render={({ field }) => (
                  <Combobox
                    ref={field.ref}
                    id="articuloId"
                    name={field.name}
                    value={typeof field.value === 'number' && !Number.isNaN(field.value) ? field.value : undefined}
                    emptyLabel="Cargar a mano (sin descontar stock)"
                    placeholder="Cargar a mano (sin descontar stock)"
                    aria-describedby={accessibility['aria-describedby']}
                    onBlur={field.onBlur}
                    onChange={(v) => {
                      field.onChange(v ?? '');
                      const art = articulos.find((a) => a.id === v);
                      if (art) {
                        setValue('nombre', art.nombre);
                        setValue('precio', art.precio);
                        setValue('cantidad', 1);
                      }
                    }}
                    options={articulos.map((a) => ({
                      value: a.id,
                      label: a.nombre,
                      sublabel: `stock ${a.stock}`,
                    }))}
                  />
                )}
              />
            )}
          </FormField>
        )}

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
        {lockedReparacionId === undefined && (
          <FormField label="Reparación asociada" error={errors.reparacionId?.message} htmlFor="reparacionId">
            {reparacionesLoading ? (
              <div className={`${inputClass()} flex items-center text-text-3`} role="status">
                Cargando reparaciones…
              </div>
            ) : reparacionesError ? (
              <div role="alert" className="flex flex-col gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[12.5px] font-semibold text-danger-fg sm:flex-row sm:items-center sm:justify-between">
                <span>No pudimos cargar las reparaciones disponibles.</span>
                <button type="button" className={btnGhost} onClick={onRetryReparaciones}>
                  Reintentar reparaciones
                </button>
              </div>
            ) : (
              <select id="reparacionId" {...register('reparacionId', { valueAsNumber: true })} className={inputClass(!!errors.reparacionId)}>
                <option value="">Sin asociar</option>
                {reparacionesDisponibles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {ordenLabel(r)} — {r.descripcionProblema.slice(0, 40)}
                    {r.descripcionProblema.length > 40 ? '…' : ''}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        )}

      </form>
    </Modal>
  );
};
