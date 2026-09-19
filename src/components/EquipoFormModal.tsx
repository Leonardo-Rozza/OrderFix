import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { FormField } from './FormField';
import { Select } from './Select';
import { TIPOS_EQUIPO, TIPO_EQUIPO_LABEL } from '../config/equipos';
import { AsyncCombobox, type AsyncComboboxOption } from './AsyncCombobox';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { inputClass, btnGhost, btnPrimary } from './ui';
import {
  useCreateEquipoMutation,
  useUpdateEquipoMutation,
} from '../api/mutations/equipos.mutations';
import { clientesOptionsSource } from '../api/queries/clientes.queries';
import type { Cliente, Equipo, EquipoCreate, EquipoUpdate } from '../types';

const schema = z.object({
  tipo: z.enum(TIPOS_EQUIPO),
  marca: z.string().trim().min(1, 'La marca es requerida').max(60, 'Máximo 60 caracteres'),
  modelo: z.string().trim().min(1, 'El modelo es requerido').max(60, 'Máximo 60 caracteres'),
  clienteId: z.number({ message: 'Seleccioná un cliente' }).min(1, 'Seleccioná un cliente'),
  imei: z.string().max(30, 'Máximo 30 caracteres').optional().or(z.literal('')),
  color: z.string().max(40, 'Máximo 40 caracteres').optional().or(z.literal('')),
  descripcion: z.string().max(255, 'Máximo 255 caracteres').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: Equipo | null;
  /** Cliente preseleccionado al crear (p. ej. desde la ficha de un cliente). */
  defaultCliente?: Cliente | null;
}

const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);

export const EquipoFormModal = ({
  isOpen,
  onClose,
  editing,
  defaultCliente,
}: Props) => {
  const createMutation = useCreateEquipoMutation();
  const updateMutation = useUpdateEquipoMutation();
  const saving = createMutation.isPending || updateMutation.isPending;
  const defaultClienteId = defaultCliente?.id;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      tipo: editing?.tipo ?? 'OTRO',
      marca: editing?.marca ?? '',
      modelo: editing?.modelo ?? '',
      clienteId: editing?.clienteId ?? defaultClienteId ?? undefined,
      imei: editing?.imei ?? '',
      color: editing?.color ?? '',
      descripcion: editing?.descripcion ?? '',
    });
  }, [isOpen, editing, defaultClienteId, reset]);

  const selectedClienteId = watch('clienteId');
  const editingClienteNombre = editing
    ? `${editing.clienteNombre ?? ''} ${editing.clienteApellido ?? ''}`.trim()
    : '';
  const selectedClienteOption: AsyncComboboxOption | undefined = editing && editingClienteNombre
    ? {
        value: editing.clienteId,
        label: editingClienteNombre,
      }
    : defaultCliente
      ? {
          value: defaultCliente.id,
          label: `${defaultCliente.nombre} ${defaultCliente.apellido ?? ''}`.trim(),
          sublabel: defaultCliente.telefono || undefined,
        }
      : undefined;
  const submitBlocked = saving || !selectedClienteId;

  const onSubmit = async (data: FormData, commitAndClose: () => void) => {
    const base: EquipoCreate = {
      tipo: editing && data.tipo === (editing.tipo ?? 'OTRO') ? undefined : data.tipo,
      marca: data.marca.trim(),
      modelo: data.modelo.trim(),
      clienteId: data.clienteId,
      imei: str(data.imei),
      color: str(data.color),
      descripcion: str(data.descripcion),
    };

    try {
      if (editing) {
        const payload: EquipoUpdate = { id: editing.id, ...base };
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(base);
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
          title={editing ? 'Editar equipo' : 'Nuevo equipo'}
          size="md"
          preventClose={saving}
          suspended={isSuspended}
          footer={(
            <FormActions>
              <button type="button" className={btnGhost} onClick={requestClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" form="equipo-form" className={btnPrimary} disabled={submitBlocked}>
                {saving
                  ? 'Guardando…'
                  : !selectedClienteId
                    ? 'Seleccioná un cliente'
                    : editing
                      ? 'Guardar cambios'
                      : 'Crear equipo'}
              </button>
            </FormActions>
          )}
        >
          <form
            id="equipo-form"
            onSubmit={handleSubmit((data) => onSubmit(data, commitAndClose))}
            aria-busy={saving}
          >
        <fieldset disabled={saving} className="m-0 min-w-0 space-y-4 border-0 p-0">
        <FormField label="Tipo de equipo" error={errors.tipo?.message} htmlFor="tipo">
          <Select id="tipo" {...register('tipo')} hasError={!!errors.tipo}>
            {TIPOS_EQUIPO.map((tipo) => <option key={tipo} value={tipo}>{TIPO_EQUIPO_LABEL[tipo]}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Marca" required error={errors.marca?.message} htmlFor="marca">
            <input id="marca" type="text" maxLength={60} {...register('marca')} className={inputClass(!!errors.marca)} placeholder="Ej: Apple" />
          </FormField>
          <FormField label="Modelo" required error={errors.modelo?.message} htmlFor="modelo">
            <input id="modelo" type="text" maxLength={60} {...register('modelo')} className={inputClass(!!errors.modelo)} placeholder="Modelo del equipo" />
          </FormField>
        </div>

        <FormField label="Cliente" required error={errors.clienteId?.message} htmlFor="clienteId">
          {(accessibility) => (
            <div className="min-w-0">
              <Controller
                control={control}
                name="clienteId"
                render={({ field }) => (
                  <AsyncCombobox
                    ref={field.ref}
                    id="clienteId"
                    name={field.name}
                    value={field.value}
                    selectedOption={selectedClienteOption}
                    source={clientesOptionsSource}
                    enabled={isOpen}
                    onChange={(v) => field.onChange(v)}
                    onBlur={field.onBlur}
                    hasError={!!errors.clienteId}
                    aria-invalid={accessibility['aria-invalid']}
                    aria-describedby={accessibility['aria-describedby']}
                    aria-required={accessibility['aria-required']}
                    disabled={saving}
                    placeholder="Seleccioná un cliente"
                    searchAriaLabel="Buscar cliente"
                    entityName="cliente"
                    entityNamePlural="clientes"
                    emptyMessage="No hay clientes disponibles. Cargá uno antes de registrar el equipo."
                    errorMessage="No pudimos cargar los clientes."
                  />
                )}
              />
            </div>
          )}
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Serie / IMEI" error={errors.imei?.message} htmlFor="imei">
            <input id="imei" type="text" maxLength={30} {...register('imei')} className={inputClass(!!errors.imei)} />
          </FormField>
          <FormField label="Color" error={errors.color?.message} htmlFor="color">
            <input id="color" type="text" maxLength={40} {...register('color')} className={inputClass(!!errors.color)} />
          </FormField>
        </div>

        <FormField label="Descripción" error={errors.descripcion?.message} htmlFor="descripcion">
          <textarea
            id="descripcion"
            rows={3}
            maxLength={255}
            {...register('descripcion')}
            className={`${inputClass(!!errors.descripcion)} resize-none`}
            placeholder="Detalle adicional del equipo…"
          />
        </FormField>
        </fieldset>
          </form>
        </Modal>
      )}
    </UnsavedChangesGuard>
  );
};
