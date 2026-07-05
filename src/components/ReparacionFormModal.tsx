import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { Combobox } from './Combobox';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { ESTADOS, ESTADOS_LIST } from '../config/estados';
import {
  useCreateReparacionMutation,
  useUpdateReparacionMutation,
  useIngresoRapidoMutation,
} from '../api/mutations/reparaciones.mutations';
import { useUsuariosQuery } from '../api/queries/usuarios.queries';
import { useAuth } from '../store/auth.store';
import { CUENTA_LABEL, RIESGO_CUENTA_MSG } from '../config/ingreso';
import { fotosPorMomento } from '../utils/reparacion';
import type { CuentaVinculada, EstadoReparacion, Equipo, Foto, IngresoRapidoRequest, Reparacion, ReparacionCreate, ReparacionUpdate } from '../types';

const schema = z
  .object({
    modo: z.enum(['nuevo', 'existente']),
    equipoId: z.union([z.number(), z.nan()]).optional(),
    // Cliente nuevo (datos mínimos)
    clienteNombre: z.string().optional(),
    clienteApellido: z.string().optional(),
    clienteTelefono: z.string().optional(),
    // Equipo nuevo (datos mínimos)
    marca: z.string().optional(),
    modelo: z.string().optional(),
    // Reparación
    descripcionProblema: z.string().min(1, 'Describí el problema'),
    // Derivado de la config para no desincronizarse cuando se agreguen estados.
    estado: z.enum(Object.keys(ESTADOS) as [EstadoReparacion, ...EstadoReparacion[]]),
    precioEstimado: z.union([z.number().min(0), z.nan(), z.literal('')]).optional(),
    precioFinal: z.union([z.number().min(0), z.nan(), z.literal('')]).optional(),
    fechaIngreso: z.string().optional().or(z.literal('')),
    fechaEstimadaEntrega: z.string().optional().or(z.literal('')),
    // Orden de trabajo ampliada (opcional)
    patronDesbloqueo: z.string().optional(),
    pinDesbloqueo: z.string().optional(),
    accesorios: z.string().optional(),
    condicionesIngreso: z.string().optional(),
    observaciones: z.string().optional(),
    tecnicoId: z.union([z.number(), z.nan()]).optional(),
    fotosIngresoText: z.string().optional(),
    fotosPostText: z.string().optional(),
    // Riesgos del ingreso (contrato §4.5)
    mojado: z.boolean(),
    trabajoEnPlaca: z.boolean(),
    noTesteableAlIngreso: z.boolean(),
    tieneBloqueoPantalla: z.boolean(),
    tieneCuentaVinculada: z.enum(['NINGUNA', 'ICLOUD', 'GOOGLE', 'OTRA']),
    clienteConoceCredenciales: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.modo === 'existente') {
      if (!val.equipoId || Number.isNaN(val.equipoId)) ctx.addIssue({ path: ['equipoId'], code: 'custom', message: 'Seleccioná un equipo' });
    } else {
      if (!val.clienteNombre?.trim()) ctx.addIssue({ path: ['clienteNombre'], code: 'custom', message: 'Nombre requerido' });
      if (!val.clienteTelefono?.trim()) ctx.addIssue({ path: ['clienteTelefono'], code: 'custom', message: 'Teléfono requerido' });
      if (!val.marca?.trim()) ctx.addIssue({ path: ['marca'], code: 'custom', message: 'Marca requerida' });
      if (!val.modelo?.trim()) ctx.addIssue({ path: ['modelo'], code: 'custom', message: 'Modelo requerido' });
    }
  });

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: Reparacion | null;
  equipos: Equipo[];
  /** Se llama tras crear por carga rápida, con el id de la reparación nueva. */
  onCreated?: (reparacionId: number) => void;
}

const num = (v: number | '' | undefined): number | undefined =>
  v === '' || v === undefined || Number.isNaN(v) ? undefined : v;
const numId = (v: number | undefined): number | undefined =>
  v === undefined || Number.isNaN(v) ? undefined : v;
const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);
const urls = (v: string | undefined): string[] => (v ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
const fotosArray = (ingreso: string | undefined, post: string | undefined): Foto[] | undefined => {
  const arr: Foto[] = [
    ...urls(ingreso).map((url): Foto => ({ url, momento: 'INGRESO' })),
    ...urls(post).map((url): Foto => ({ url, momento: 'POST_REPARACION' })),
  ];
  return arr.length ? arr : undefined;
};

export const ReparacionFormModal = ({ isOpen, onClose, editing, equipos, onCreated }: Props) => {
  const createMutation = useCreateReparacionMutation();
  const updateMutation = useUpdateReparacionMutation();
  const ingresoRapido = useIngresoRapidoMutation();
  const { isAdmin } = useAuth();
  const { data: tecnicos = [] } = useUsuariosQuery(isAdmin);

  const saving = createMutation.isPending || updateMutation.isPending || ingresoRapido.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      modo: 'nuevo',
      estado: 'INGRESADO',
      mojado: false,
      trabajoEnPlaca: false,
      noTesteableAlIngreso: false,
      tieneBloqueoPantalla: false,
      tieneCuentaVinculada: 'NINGUNA',
      clienteConoceCredenciales: false,
    },
  });

  const modo = watch('modo');
  const esRapido = !editing && modo === 'nuevo';
  const cuentaVinculada = watch('tieneCuentaVinculada');
  const conoceCredenciales = watch('clienteConoceCredenciales');

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        modo: 'existente',
        equipoId: editing.equipoId,
        descripcionProblema: editing.descripcionProblema,
        estado: editing.estado,
        precioEstimado: editing.precioEstimado ?? '',
        precioFinal: editing.precioFinal ?? '',
        fechaIngreso: editing.fechaIngreso ?? '',
        fechaEstimadaEntrega: editing.fechaEstimadaEntrega ?? '',
        patronDesbloqueo: editing.patronDesbloqueo ?? '',
        pinDesbloqueo: editing.pinDesbloqueo ?? '',
        accesorios: editing.accesorios ?? '',
        condicionesIngreso: editing.condicionesIngreso ?? '',
        observaciones: editing.observaciones ?? '',
        tecnicoId: editing.tecnicoId ?? undefined,
        fotosIngresoText: fotosPorMomento(editing.fotos, 'INGRESO').join('\n'),
        fotosPostText: fotosPorMomento(editing.fotos, 'POST_REPARACION').join('\n'),
        mojado: editing.mojado ?? false,
        trabajoEnPlaca: editing.trabajoEnPlaca ?? false,
        noTesteableAlIngreso: editing.noTesteableAlIngreso ?? false,
        tieneBloqueoPantalla: editing.tieneBloqueoPantalla ?? false,
        tieneCuentaVinculada: editing.tieneCuentaVinculada ?? 'NINGUNA',
        clienteConoceCredenciales: editing.clienteConoceCredenciales ?? false,
      });
    } else {
      reset({
        // Flujo rápido por defecto: cargar cliente + equipo en el acto.
        modo: 'nuevo',
        equipoId: undefined,
        clienteNombre: '',
        clienteApellido: '',
        clienteTelefono: '',
        marca: '',
        modelo: '',
        descripcionProblema: '',
        estado: 'INGRESADO',
        precioEstimado: '',
        precioFinal: '',
        fechaIngreso: new Date().toISOString().slice(0, 10),
        fechaEstimadaEntrega: '',
        patronDesbloqueo: '',
        pinDesbloqueo: '',
        accesorios: '',
        condicionesIngreso: '',
        observaciones: '',
        tecnicoId: undefined,
        fotosIngresoText: '',
        fotosPostText: '',
        mojado: false,
        trabajoEnPlaca: false,
        noTesteableAlIngreso: false,
        tieneBloqueoPantalla: false,
        tieneCuentaVinculada: 'NINGUNA',
        clienteConoceCredenciales: false,
      });
    }
  }, [isOpen, editing, reset]);

  const ordenTrabajo = (data: FormData) => ({
    patronDesbloqueo: str(data.patronDesbloqueo),
    pinDesbloqueo: str(data.pinDesbloqueo),
    accesorios: str(data.accesorios),
    condicionesIngreso: str(data.condicionesIngreso),
    observaciones: str(data.observaciones),
    tecnicoId: numId(data.tecnicoId),
    fotos: fotosArray(data.fotosIngresoText, data.fotosPostText),
    mojado: data.mojado,
    trabajoEnPlaca: data.trabajoEnPlaca,
    noTesteableAlIngreso: data.noTesteableAlIngreso,
    tieneBloqueoPantalla: data.tieneBloqueoPantalla,
    tieneCuentaVinculada: data.tieneCuentaVinculada,
    clienteConoceCredenciales: data.clienteConoceCredenciales,
  });

  const onSubmit = async (data: FormData) => {
    // Editar reparación existente
    if (editing) {
      const payload: ReparacionUpdate = {
        id: editing.id,
        equipoId: editing.equipoId,
        descripcionProblema: data.descripcionProblema,
        estado: data.estado,
        precioEstimado: num(data.precioEstimado),
        precioFinal: num(data.precioFinal),
        fechaIngreso: str(data.fechaIngreso),
        fechaEstimadaEntrega: str(data.fechaEstimadaEntrega),
        ...ordenTrabajo(data),
      };
      await updateMutation.mutateAsync(payload);
      onClose();
      return;
    }

    // Carga rápida: un solo endpoint crea cliente + equipo + reparación
    if (data.modo === 'nuevo') {
      const payload: IngresoRapidoRequest = {
        clienteNombre: data.clienteNombre!.trim(),
        clienteApellido: str(data.clienteApellido),
        clienteTelefono: data.clienteTelefono!.trim(),
        equipoMarca: data.marca!.trim(),
        equipoModelo: data.modelo!.trim(),
        descripcionProblema: data.descripcionProblema,
        precioEstimado: num(data.precioEstimado),
      };
      const res = await ingresoRapido.mutateAsync(payload);
      onClose();
      onCreated?.(res.reparacion.id);
      return;
    }

    // Equipo existente: alta normal con todos los campos
    const payload: ReparacionCreate = {
      equipoId: data.equipoId as number,
      descripcionProblema: data.descripcionProblema,
      estado: data.estado,
      precioEstimado: num(data.precioEstimado),
      precioFinal: num(data.precioFinal),
      fechaIngreso: str(data.fechaIngreso),
      fechaEstimadaEntrega: str(data.fechaEstimadaEntrega),
      ...ordenTrabajo(data),
    };
    await createMutation.mutateAsync(payload);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar reparación' : 'Nueva reparación'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Selector de modo (solo al crear) */}
        {!editing && (
          <div className="flex rounded-lg bg-surface-3 p-1">
            {(['nuevo', 'existente'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setValue('modo', m)}
                className={`flex-1 rounded-md px-3 py-2 text-[13px] font-bold transition ${
                  modo === m ? 'bg-surface text-text shadow-sm' : 'text-text-2'
                }`}
              >
                {m === 'nuevo' ? 'Cliente y equipo nuevos' : 'Elegir equipo existente'}
              </button>
            ))}
          </div>
        )}

        {/* MODO NUEVO: datos mínimos de cliente + equipo */}
        {esRapido && (
          <div className="space-y-4 rounded-xl border border-border bg-surface-2 p-4">
            <div className="text-[12px] font-extrabold uppercase tracking-wide text-text-3">Cliente</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nombre" required error={errors.clienteNombre?.message} htmlFor="clienteNombre">
                <input id="clienteNombre" type="text" {...register('clienteNombre')} className={inputClass(!!errors.clienteNombre)} placeholder="Ej: Juan" />
              </FormField>
              <FormField label="Apellido" error={errors.clienteApellido?.message} htmlFor="clienteApellido">
                <input id="clienteApellido" type="text" {...register('clienteApellido')} className={inputClass(!!errors.clienteApellido)} placeholder="Opcional" />
              </FormField>
            </div>
            <FormField label="Teléfono" required error={errors.clienteTelefono?.message} htmlFor="clienteTelefono">
              <input id="clienteTelefono" type="tel" {...register('clienteTelefono')} className={inputClass(!!errors.clienteTelefono)} placeholder="+54 9 11 5555-1234" />
            </FormField>

            <div className="pt-1 text-[12px] font-extrabold uppercase tracking-wide text-text-3">Equipo</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Marca" required error={errors.marca?.message} htmlFor="marca">
                <input id="marca" type="text" {...register('marca')} className={inputClass(!!errors.marca)} placeholder="Ej: Apple" />
              </FormField>
              <FormField label="Modelo" required error={errors.modelo?.message} htmlFor="modelo">
                <input id="modelo" type="text" {...register('modelo')} className={inputClass(!!errors.modelo)} placeholder="Ej: iPhone 11" />
              </FormField>
            </div>

            <p className="text-[12px] text-text-3">
              Con esto alcanza para abrir la orden. Si el teléfono ya existe, se reutiliza ese cliente. El resto
              (email, dirección, IMEI, color…) lo completás después desde Clientes y Equipos.
            </p>
          </div>
        )}

        {/* MODO EXISTENTE: seleccionar equipo */}
        {(editing || modo === 'existente') && (
          <FormField label="Equipo" required error={errors.equipoId?.message} htmlFor="equipoId">
            <Controller
              control={control}
              name="equipoId"
              render={({ field }) => (
                <Combobox
                  id="equipoId"
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  hasError={!!errors.equipoId}
                  disabled={!!editing}
                  placeholder="Seleccioná un equipo"
                  options={equipos.map((e) => ({
                    value: e.id,
                    label: `${e.marca} ${e.modelo}`,
                    sublabel: e.clienteNombre
                      ? `${e.clienteNombre} ${e.clienteApellido ?? ''}`.trim()
                      : undefined,
                  }))}
                />
              )}
            />
          </FormField>
        )}

        <FormField label="Problema reportado" required error={errors.descripcionProblema?.message} htmlFor="descripcionProblema">
          <textarea
            id="descripcionProblema"
            rows={3}
            {...register('descripcionProblema')}
            className={`${inputClass(!!errors.descripcionProblema)} resize-none`}
            placeholder="Ej: No carga, pantalla rota, no enciende…"
          />
        </FormField>

        {esRapido ? (
          /* En carga rápida solo el precio estimado (lo demás se completa luego) */
          <FormField label="Precio estimado" error={errors.precioEstimado?.message} htmlFor="precioEstimado">
            <input id="precioEstimado" type="number" step="0.01" min="0" {...register('precioEstimado', { valueAsNumber: true })} className={inputClass(!!errors.precioEstimado)} placeholder="0 (opcional)" />
          </FormField>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Estado" error={errors.estado?.message} htmlFor="estado">
                <select id="estado" {...register('estado')} className={inputClass(!!errors.estado)}>
                  {ESTADOS_LIST.map((e) => (
                    <option key={e.key} value={e.key}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Fecha de ingreso" error={errors.fechaIngreso?.message} htmlFor="fechaIngreso">
                <input id="fechaIngreso" type="date" {...register('fechaIngreso')} className={inputClass(!!errors.fechaIngreso)} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Precio estimado" error={errors.precioEstimado?.message} htmlFor="precioEstimado">
                <input id="precioEstimado" type="number" step="0.01" min="0" {...register('precioEstimado', { valueAsNumber: true })} className={inputClass(!!errors.precioEstimado)} placeholder="0" />
              </FormField>
              <FormField label="Precio final" error={errors.precioFinal?.message} htmlFor="precioFinal">
                <input id="precioFinal" type="number" step="0.01" min="0" {...register('precioFinal', { valueAsNumber: true })} className={inputClass(!!errors.precioFinal)} placeholder="0" />
              </FormField>
            </div>

            <FormField label="Entrega estimada" error={errors.fechaEstimadaEntrega?.message} htmlFor="fechaEstimadaEntrega">
              <input id="fechaEstimadaEntrega" type="date" {...register('fechaEstimadaEntrega')} className={inputClass(!!errors.fechaEstimadaEntrega)} />
            </FormField>

            {/* Orden de trabajo (opcional, colapsable) */}
            <details className="rounded-xl border border-border bg-surface-2 p-4 [&_summary]:cursor-pointer">
              <summary className="text-[13px] font-extrabold text-text-2">Detalles de ingreso (opcional)</summary>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Patrón de desbloqueo" htmlFor="patronDesbloqueo">
                    <input id="patronDesbloqueo" type="text" {...register('patronDesbloqueo')} className={inputClass()} placeholder="Ej: L invertida" />
                  </FormField>
                  <FormField label="PIN / contraseña" htmlFor="pinDesbloqueo">
                    <input id="pinDesbloqueo" type="text" {...register('pinDesbloqueo')} className={inputClass()} placeholder="Ej: 1234" />
                  </FormField>
                </div>
                <FormField label="Accesorios que deja" htmlFor="accesorios">
                  <input id="accesorios" type="text" {...register('accesorios')} className={inputClass()} placeholder="Cargador, funda, SIM…" />
                </FormField>
                <FormField label="Condiciones de ingreso" htmlFor="condicionesIngreso">
                  <textarea id="condicionesIngreso" rows={2} {...register('condicionesIngreso')} className={`${inputClass()} resize-none`} placeholder="Rayones, golpes, etc." />
                </FormField>

                {/* Riesgos del ingreso: definen garantía limitada y la bandera de cuenta vinculada */}
                <div className="space-y-3 border-t border-border pt-3.5">
                  <div className="text-[12px] font-extrabold uppercase tracking-wide text-text-3">Riesgos del ingreso</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-[13.5px] font-semibold text-text-2">
                      <input type="checkbox" {...register('mojado')} className="h-4 w-4 accent-[var(--primary)]" />
                      Mojado / cayó al agua
                    </label>
                    <label className="flex items-center gap-2 text-[13.5px] font-semibold text-text-2">
                      <input type="checkbox" {...register('trabajoEnPlaca')} className="h-4 w-4 accent-[var(--primary)]" />
                      Trabajo en placa
                    </label>
                    <label className="flex items-center gap-2 text-[13.5px] font-semibold text-text-2">
                      <input type="checkbox" {...register('noTesteableAlIngreso')} className="h-4 w-4 accent-[var(--primary)]" />
                      No testeable al ingreso
                    </label>
                    <label className="flex items-center gap-2 text-[13.5px] font-semibold text-text-2">
                      <input type="checkbox" {...register('tieneBloqueoPantalla')} className="h-4 w-4 accent-[var(--primary)]" />
                      Tiene bloqueo de pantalla
                    </label>
                  </div>
                  <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
                    <FormField label="Cuenta vinculada" htmlFor="tieneCuentaVinculada">
                      <select id="tieneCuentaVinculada" {...register('tieneCuentaVinculada')} className={inputClass()}>
                        {(Object.keys(CUENTA_LABEL) as CuentaVinculada[]).map((k) => (
                          <option key={k} value={k}>
                            {CUENTA_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    {cuentaVinculada !== 'NINGUNA' && (
                      <label className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-text-2">
                        <input type="checkbox" {...register('clienteConoceCredenciales')} className="h-4 w-4 accent-[var(--primary)]" />
                        El cliente conoce las credenciales
                      </label>
                    )}
                  </div>
                  {cuentaVinculada !== 'NINGUNA' && !conoceCredenciales && (
                    <p className="rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger-fg">
                      {RIESGO_CUENTA_MSG}
                    </p>
                  )}
                </div>
                <FormField label="Observaciones internas" htmlFor="observaciones">
                  <textarea id="observaciones" rows={2} {...register('observaciones')} className={`${inputClass()} resize-none`} placeholder="Notas privadas (no se muestran al cliente)" />
                </FormField>
                {isAdmin && (
                  <FormField label="Técnico asignado" htmlFor="tecnicoId">
                    <select id="tecnicoId" {...register('tecnicoId', { valueAsNumber: true })} className={inputClass()}>
                      <option value="">Sin asignar</option>
                      {tecnicos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.username}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Fotos del ingreso (una URL por línea)" htmlFor="fotosIngresoText">
                    <textarea id="fotosIngresoText" rows={2} {...register('fotosIngresoText')} className={`${inputClass()} resize-none`} placeholder="https://…/ingreso1.jpg" />
                  </FormField>
                  <FormField label="Fotos post-reparación (una URL por línea)" htmlFor="fotosPostText">
                    <textarea id="fotosPostText" rows={2} {...register('fotosPostText')} className={`${inputClass()} resize-none`} placeholder="https://…/post1.jpg" />
                  </FormField>
                </div>
              </div>
            </details>
          </>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear reparación'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
