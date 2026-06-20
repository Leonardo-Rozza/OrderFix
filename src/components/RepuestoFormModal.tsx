import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import {
  useCreateRepuestoMutation,
  useUpdateRepuestoMutation,
} from '../api/mutations/repuestos.mutations';
import { useInventarioQuery } from '../api/queries/inventario.queries';
import { useFunciones } from '../api/queries/suscripcion.queries';
import type { Reparacion, Repuesto, RepuestoCreate, RepuestoUpdate } from '../types';

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
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
  /** Si viene, el repuesto queda asociado a esa reparación y se oculta el selector. */
  lockedReparacionId?: number;
}

const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);
const numOpt = (v: number | '' | undefined): number | undefined =>
  v === '' || v === undefined || Number.isNaN(v) ? undefined : v;

export const RepuestoFormModal = ({ isOpen, onClose, editing, reparaciones = [], lockedReparacionId }: Props) => {
  const createMutation = useCreateRepuestoMutation();
  const updateMutation = useUpdateRepuestoMutation();
  // El inventario solo se ofrece al crear y si el plan lo habilita (PRO).
  const { inventario } = useFunciones();
  const { data: articulos = [] } = useInventarioQuery(isOpen && !editing && inventario);
  const saving = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
      nombre: data.nombre,
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

  const regArticulo = register('articuloId', { valueAsNumber: true });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar repuesto' : 'Nuevo repuesto'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tomar del inventario (solo al crear) → descuenta stock */}
        {!editing && articulos.length > 0 && (
          <FormField label="Artículo del inventario (opcional)" htmlFor="articuloId">
            <select
              id="articuloId"
              {...regArticulo}
              onChange={(e) => {
                regArticulo.onChange(e);
                const art = articulos.find((a) => a.id === Number(e.target.value));
                if (art) {
                  setValue('nombre', art.nombre);
                  setValue('precio', art.precio);
                  setValue('cantidad', 1);
                }
              }}
              className={inputClass()}
            >
              <option value="">Cargar a mano (sin descontar stock)</option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} — stock {a.stock}
                </option>
              ))}
            </select>
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

        <div className={`grid gap-4 ${usaInventario ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <FormField label="Precio" required error={errors.precio?.message} htmlFor="precio">
            <input id="precio" type="number" step="0.01" min="0" {...register('precio', { valueAsNumber: true })} className={inputClass(!!errors.precio)} placeholder="0" />
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
            <select id="reparacionId" {...register('reparacionId', { valueAsNumber: true })} className={inputClass(!!errors.reparacionId)}>
              <option value="">Sin asociar</option>
              {reparaciones.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.descripcionProblema.slice(0, 40)}
                  {r.descripcionProblema.length > 40 ? '…' : ''}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear repuesto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
