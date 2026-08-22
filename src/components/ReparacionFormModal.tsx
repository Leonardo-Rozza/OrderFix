import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormActions, Modal } from './Modal';
import { FormField } from './FormField';
import { Combobox } from './Combobox';
import { FotoUploader } from './FotoUploader';
import { MoneyInput } from './MoneyInput';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { ESTADOS, ESTADOS_LIST, transicionesDesde } from '../config/estados';
import {
  useCreateReparacionMutation,
  useCompletarIngresoRapidoMutation,
  useUpdateReparacionMutation,
  useIngresoRapidoMutation,
} from '../api/mutations/reparaciones.mutations';
import { useUsuariosQuery } from '../api/queries/usuarios.queries';
import { useAuth } from '../store/auth.store';
import { CUENTA_LABEL, RIESGO_CUENTA_MSG } from '../config/ingreso';
import { fotosPorMomento } from '../utils/reparacion';
import { toLocalDateInputValue } from '../utils/date';
import { showSuccess } from '../utils/toast';
import type {
  CuentaVinculada,
  EstadoReparacion,
  Equipo,
  Foto,
  IngresoRapidoRequest,
  IngresoRapidoResponse,
  Reparacion,
  ReparacionCreate,
  ReparacionCredenciales,
  ReparacionUpdate,
} from '../types';

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
    descripcionProblema: z.string().trim().min(1, 'Describí el problema').max(255, 'Máximo 255 caracteres'),
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
    fotosIngreso: z.array(z.string()),
    fotosPost: z.array(z.string()),
    // Riesgos del ingreso (contrato §4.5)
    mojado: z.boolean(),
    trabajoEnPlaca: z.boolean(),
    noTesteableAlIngreso: z.boolean(),
    tieneBloqueoPantalla: z.boolean(),
    tieneCuentaVinculada: z.enum(['NINGUNA', 'ICLOUD', 'GOOGLE', 'OTRA']),
    clienteConoceCredenciales: z.boolean(),
    // Garantía (opcional: si no se manda, el backend usa su default al entregar)
    garantiaDias: z.union([z.number().min(1, 'Mín. 1'), z.nan(), z.literal('')]).optional(),
    garantiaCondiciones: z.string().optional(),
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
  equiposLoading?: boolean;
  equiposError?: boolean;
  onRetryEquipos?: () => void;
  /** Se llama tras crear por carga rápida, con el id de la reparación nueva. */
  onCreated?: (reparacionId: number) => void;
  /** Solo la ficha autenticada conoce estos valores; un listado nunca los pasa. */
  credenciales?: ReparacionCredenciales;
  /** Borra la copia efímera de la ficha antes de entregar el equipo. */
  onLimpiarCredenciales?: () => void;
  /** Si la entrega falla, vuelve a pedir el detalle seguro al backend. */
  onRefetchCredenciales?: () => Promise<ReparacionCredenciales>;
}

const num = (v: number | '' | undefined): number | undefined =>
  v === '' || v === undefined || Number.isNaN(v) ? undefined : v;
const numId = (v: number | undefined): number | undefined =>
  v === undefined || Number.isNaN(v) ? undefined : v;
const str = (v: string | undefined): string | undefined => (v && v.trim() !== '' ? v : undefined);
const credencialEditada = (
  value: string | undefined,
  initialValue: string | null | undefined,
): string | undefined => {
  const actual = value?.trim() ?? '';
  // `undefined` significa que este formulario vino de un listado y no conoce el
  // secreto guardado. Vacío debe omitir el campo para conservarlo.
  if (initialValue === undefined) return actual || undefined;
  const inicial = initialValue?.trim() ?? '';
  // Sin cambios: omitir conserva el cifrado que ya tiene el backend.
  if (actual === inicial) return undefined;
  // Vacío intencional: el contrato exige mandar "" para borrarlo.
  return actual;
};
const fotosArray = (ingreso: string[], post: string[]): Foto[] | undefined => {
  const arr: Foto[] = [
    ...ingreso.map((url): Foto => ({ url, momento: 'INGRESO' })),
    ...post.map((url): Foto => ({ url, momento: 'POST_REPARACION' })),
  ];
  return arr.length ? arr : undefined;
};

export const ReparacionFormModal = ({
  isOpen,
  onClose,
  editing,
  equipos,
  equiposLoading = false,
  equiposError = false,
  onRetryEquipos,
  onCreated,
  credenciales,
  onLimpiarCredenciales,
  onRefetchCredenciales,
}: Props) => {
  const createMutation = useCreateReparacionMutation();
  const updateMutation = useUpdateReparacionMutation();
  const ingresoRapido = useIngresoRapidoMutation();
  const completarIngresoRapido = useCompletarIngresoRapidoMutation();
  const [ingresoRapidoPendiente, setIngresoRapidoPendiente] = useState<IngresoRapidoResponse | null>(null);
  const [subiendoFotosIngreso, setSubiendoFotosIngreso] = useState(false);
  const [subiendoFotosPost, setSubiendoFotosPost] = useState(false);
  const fechaIngresoInicial = useRef(toLocalDateInputValue());
  const detallesRef = useRef<HTMLDetailsElement>(null);
  const formKeyRef = useRef<string | null>(null);
  const { isAdmin } = useAuth();
  const { data: tecnicos = [] } = useUsuariosQuery(isAdmin);

  const saving = createMutation.isPending
    || updateMutation.isPending
    || ingresoRapido.isPending
    || completarIngresoRapido.isPending;
  const uploadingPhotos = subiendoFotosIngreso || subiendoFotosPost;
  const blocking = saving || uploadingPhotos;

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
      fotosIngreso: [],
      fotosPost: [],
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
  const needsEquipoOptions = !editing && modo === 'existente';
  const equipoSelectionBlocked = needsEquipoOptions
    && (equiposLoading || equiposError || equipos.length === 0);
  const submitBlocked = blocking || equipoSelectionBlocked;
  const equipoOptions = equipos.map((equipo) => ({
    value: equipo.id,
    label: `${equipo.marca} ${equipo.modelo}`,
    sublabel: equipo.clienteNombre
      ? `${equipo.clienteNombre} ${equipo.clienteApellido ?? ''}`.trim()
      : undefined,
  }));
  if (editing && !equipoOptions.some((option) => option.value === editing.equipoId)) {
    equipoOptions.unshift({
      value: editing.equipoId,
      label: `${editing.equipoMarca} ${editing.equipoModelo}`,
      sublabel: editing.clienteNombre
        ? `${editing.clienteNombre} ${editing.clienteApellido ?? ''}`.trim()
        : undefined,
    });
  }
  const cuentaVinculada = watch('tieneCuentaVinculada');
  const conoceCredenciales = watch('clienteConoceCredenciales');
  const estadosDisponibles = editing
    ? [ESTADOS[editing.estado], ...transicionesDesde(editing.estado).map((estado) => ESTADOS[estado])]
    : ESTADOS_LIST;

  useEffect(() => {
    if (!isOpen) {
      // El modal queda montado aunque esté oculto: borrar explícitamente los
      // secretos evita que sobrevivan en react-hook-form entre aperturas.
      setValue('patronDesbloqueo', '');
      setValue('pinDesbloqueo', '');
      setIngresoRapidoPendiente(null);
      formKeyRef.current = null;
      return;
    }

    const formKey = editing ? `editar-${editing.id}` : 'crear';
    // Una invalidación del detalle no debe pisar lo que el técnico ya escribió.
    if (formKeyRef.current === formKey) return;
    formKeyRef.current = formKey;
    setIngresoRapidoPendiente(null);

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
        patronDesbloqueo: credenciales?.patronDesbloqueo ?? '',
        pinDesbloqueo: credenciales?.pinDesbloqueo ?? '',
        accesorios: editing.accesorios ?? '',
        condicionesIngreso: editing.condicionesIngreso ?? '',
        observaciones: editing.observaciones ?? '',
        tecnicoId: editing.tecnicoId ?? undefined,
        fotosIngreso: fotosPorMomento(editing.fotos, 'INGRESO'),
        fotosPost: fotosPorMomento(editing.fotos, 'POST_REPARACION'),
        mojado: editing.mojado ?? false,
        trabajoEnPlaca: editing.trabajoEnPlaca ?? false,
        noTesteableAlIngreso: editing.noTesteableAlIngreso ?? false,
        tieneBloqueoPantalla: editing.tieneBloqueoPantalla ?? false,
        tieneCuentaVinculada: editing.tieneCuentaVinculada ?? 'NINGUNA',
        clienteConoceCredenciales: editing.clienteConoceCredenciales ?? false,
        garantiaDias: editing.garantiaDias ?? '',
        garantiaCondiciones: editing.garantiaCondiciones ?? '',
      });
    } else {
      const fechaIngresoLocal = toLocalDateInputValue();
      fechaIngresoInicial.current = fechaIngresoLocal;
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
        fechaIngreso: fechaIngresoLocal,
        fechaEstimadaEntrega: '',
        patronDesbloqueo: '',
        pinDesbloqueo: '',
        accesorios: '',
        condicionesIngreso: '',
        observaciones: '',
        tecnicoId: undefined,
        fotosIngreso: [],
        fotosPost: [],
        mojado: false,
        trabajoEnPlaca: false,
        noTesteableAlIngreso: false,
        tieneBloqueoPantalla: false,
        tieneCuentaVinculada: 'NINGUNA',
        clienteConoceCredenciales: false,
        garantiaDias: '',
        garantiaCondiciones: '',
      });
    }
  }, [isOpen, editing, credenciales, reset, setValue]);

  const ordenTrabajo = (data: FormData, omitirCredenciales = false) => ({
    patronDesbloqueo: omitirCredenciales
      ? undefined
      : editing
        ? credencialEditada(data.patronDesbloqueo, credenciales?.patronDesbloqueo)
        : str(data.patronDesbloqueo),
    pinDesbloqueo: omitirCredenciales
      ? undefined
      : editing
        ? credencialEditada(data.pinDesbloqueo, credenciales?.pinDesbloqueo)
        : str(data.pinDesbloqueo),
    accesorios: str(data.accesorios),
    condicionesIngreso: str(data.condicionesIngreso),
    observaciones: str(data.observaciones),
    tecnicoId: numId(data.tecnicoId),
    fotos: fotosArray(data.fotosIngreso, data.fotosPost),
    mojado: data.mojado,
    trabajoEnPlaca: data.trabajoEnPlaca,
    noTesteableAlIngreso: data.noTesteableAlIngreso,
    tieneBloqueoPantalla: data.tieneBloqueoPantalla,
    tieneCuentaVinculada: data.tieneCuentaVinculada,
    clienteConoceCredenciales: data.clienteConoceCredenciales,
    garantiaDias: num(data.garantiaDias),
    garantiaCondiciones: str(data.garantiaCondiciones),
  });

  /**
   * ¿El modo "nuevo" cargó algo más allá de lo que acepta el ingreso rápido?
   * Si es así, hace falta un segundo request (update) para no perder esos datos.
   */
  const tieneDetallesExtra = (data: FormData): boolean => {
    if (data.estado !== 'INGRESADO') return true;
    if (num(data.precioFinal) !== undefined) return true;
    if (str(data.fechaIngreso) && data.fechaIngreso !== fechaIngresoInicial.current) return true;
    if (str(data.fechaEstimadaEntrega) !== undefined) return true;
    return Object.values(ordenTrabajo(data)).some((v) => {
      if (typeof v === 'boolean') return v;
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== 'NINGUNA';
    });
  };

  const payloadDetallesIngresoRapido = (
    data: FormData,
    response: IngresoRapidoResponse,
  ): ReparacionUpdate => ({
    id: response.reparacion.id,
    equipoId: response.reparacion.equipoId,
    descripcionProblema: data.descripcionProblema,
    estado: data.estado,
    precioEstimado: num(data.precioEstimado),
    precioFinal: num(data.precioFinal),
    fechaIngreso: str(data.fechaIngreso),
    fechaEstimadaEntrega: str(data.fechaEstimadaEntrega),
    ...ordenTrabajo(data, data.estado === 'ENTREGADO'),
  });

  const finalizarIngresoRapido = (response: IngresoRapidoResponse) => {
    setIngresoRapidoPendiente(null);
    showSuccess(response.clienteNuevo ? 'Reparación y cliente creados' : 'Reparación creada');
    onClose();
    onCreated?.(response.reparacion.id);
  };

  const onSubmit = async (data: FormData) => {
    if (equipoSelectionBlocked) return;
    // El botón externo queda deshabilitado, pero este guard también cubre un
    // submit implícito por Enter mientras el input de archivos sigue trabajando.
    if (uploadingPhotos) return;

    const eliminaCredenciales = data.estado === 'ENTREGADO';
    if (eliminaCredenciales) {
      // También cubre un alta importada directamente como entregada.
      setValue('patronDesbloqueo', '');
      setValue('pinDesbloqueo', '');
      onLimpiarCredenciales?.();
    }

    // Editar reparación existente
    if (editing) {
      const entregando = editing.estado !== 'ENTREGADO' && data.estado === 'ENTREGADO';
      const payload: ReparacionUpdate = {
        id: editing.id,
        equipoId: editing.equipoId,
        descripcionProblema: data.descripcionProblema,
        estado: data.estado,
        precioEstimado: num(data.precioEstimado),
        precioFinal: num(data.precioFinal),
        fechaIngreso: str(data.fechaIngreso),
        fechaEstimadaEntrega: str(data.fechaEstimadaEntrega),
        ...ordenTrabajo(data, eliminaCredenciales),
      };

      try {
        await updateMutation.mutateAsync(payload);
      } catch {
        if (entregando && onRefetchCredenciales) {
          try {
            const restauradas = await onRefetchCredenciales();
            setValue('patronDesbloqueo', restauradas.patronDesbloqueo ?? '');
            setValue('pinDesbloqueo', restauradas.pinDesbloqueo ?? '');
          } catch {
            // El GET ya informa su propio error. Mantener los campos vacíos es
            // la degradación segura si tampoco se pudo restaurar el detalle.
          }
        }
        return;
      }
      onClose();
      return;
    }

    // El POST del intento anterior ya creó cliente, equipo y reparación. Aunque
    // el usuario haya tocado el selector de modo, sólo se reintenta completar
    // esa misma reparación para no duplicarla.
    if (ingresoRapidoPendiente) {
      const pendiente = ingresoRapidoPendiente;
      try {
        await completarIngresoRapido.mutateAsync(payloadDetallesIngresoRapido(data, pendiente));
      } catch {
        return;
      }
      finalizarIngresoRapido(pendiente);
      return;
    }

    // Cliente + equipo nuevos: el ingreso rápido crea los tres (cliente, equipo
    // y reparación) en un endpoint mínimo; si además se cargaron detalles de la
    // orden de trabajo, se completan con un update sobre la reparación recién creada.
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
      let res: IngresoRapidoResponse;
      try {
        res = await ingresoRapido.mutateAsync(payload);
      } catch {
        return;
      }
      if (tieneDetallesExtra(data)) {
        setIngresoRapidoPendiente(res);
        try {
          await completarIngresoRapido.mutateAsync(payloadDetallesIngresoRapido(data, res));
        } catch {
          return;
        }
      }
      finalizarIngresoRapido(res);
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
      ...ordenTrabajo(data, eliminaCredenciales),
    };
    await createMutation.mutateAsync(payload);
    onClose();
  };

  const onInvalid = (invalid: typeof errors) => {
    if (!invalid.garantiaDias) return;
    if (detallesRef.current) detallesRef.current.open = true;
    window.requestAnimationFrame(() => {
      const field = document.getElementById('garantiaDias');
      field?.focus();
      field?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Editar reparación' : 'Nueva reparación'}
      size="lg"
      preventClose={blocking}
      footer={(
        <FormActions>
          <button type="button" className={btnGhost} onClick={onClose} disabled={blocking}>
            {ingresoRapidoPendiente ? 'Cerrar y completar después' : 'Cancelar'}
          </button>
          <button type="submit" form="reparacion-form" className={btnPrimary} disabled={submitBlocked}>
            {uploadingPhotos
              ? 'Subiendo fotos…'
              : saving
                ? 'Guardando…'
                : equipoSelectionBlocked && equiposLoading
                  ? 'Cargando equipos…'
                  : equipoSelectionBlocked && equiposError
                    ? 'No se cargaron equipos'
                    : equipoSelectionBlocked
                      ? 'Primero cargá un equipo'
                : ingresoRapidoPendiente
                  ? 'Reintentar detalles'
                  : editing
                    ? 'Guardar cambios'
                    : 'Crear reparación'}
          </button>
        </FormActions>
      )}
    >
      <form id="reparacion-form" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-4">
        {/* Selector de modo (solo al crear) */}
        {!editing && (
          <div className="flex rounded-lg bg-surface-3 p-1">
            {(['nuevo', 'existente'] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={blocking || !!ingresoRapidoPendiente}
                onClick={() => setValue('modo', m)}
                aria-pressed={modo === m}
                className={`min-h-11 flex-1 touch-manipulation rounded-md px-3 py-2 text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 ${
                  modo === m ? 'bg-surface text-text shadow-sm' : 'text-text-2'
                }`}
              >
                {m === 'nuevo' ? 'Cliente y equipo nuevos' : 'Elegir equipo existente'}
              </button>
            ))}
          </div>
        )}

        {ingresoRapidoPendiente ? (
          <p role="status" className="rounded-lg border border-warning/35 bg-warning-soft px-3 py-2.5 text-[12.5px] font-semibold text-warning">
            La reparación ya fue creada. Revisá los datos y reintentá guardar los detalles; no se va a duplicar.
          </p>
        ) : null}

        {/* MODO NUEVO: datos mínimos de cliente + equipo */}
        {esRapido && (
          <div className="space-y-4 rounded-xl border border-border bg-surface-2 p-4">
            <div className="text-[12px] font-extrabold uppercase tracking-wide text-text-3">Cliente</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nombre" required error={errors.clienteNombre?.message} htmlFor="clienteNombre">
                <input id="clienteNombre" type="text" maxLength={60} {...register('clienteNombre')} readOnly={!!ingresoRapidoPendiente} className={inputClass(!!errors.clienteNombre)} placeholder="Ej: Juan" />
              </FormField>
              <FormField label="Apellido" error={errors.clienteApellido?.message} htmlFor="clienteApellido">
                <input id="clienteApellido" type="text" maxLength={60} {...register('clienteApellido')} readOnly={!!ingresoRapidoPendiente} className={inputClass(!!errors.clienteApellido)} placeholder="Opcional" />
              </FormField>
            </div>
            <FormField label="Teléfono" required error={errors.clienteTelefono?.message} htmlFor="clienteTelefono">
              <input id="clienteTelefono" type="tel" maxLength={20} {...register('clienteTelefono')} readOnly={!!ingresoRapidoPendiente} className={inputClass(!!errors.clienteTelefono)} placeholder="+54 9 11 5555-1234" />
            </FormField>

            <div className="pt-1 text-[12px] font-extrabold uppercase tracking-wide text-text-3">Equipo</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Marca" required error={errors.marca?.message} htmlFor="marca">
                <input id="marca" type="text" maxLength={60} {...register('marca')} readOnly={!!ingresoRapidoPendiente} className={inputClass(!!errors.marca)} placeholder="Ej: Apple" />
              </FormField>
              <FormField label="Modelo" required error={errors.modelo?.message} htmlFor="modelo">
                <input id="modelo" type="text" maxLength={60} {...register('modelo')} readOnly={!!ingresoRapidoPendiente} className={inputClass(!!errors.modelo)} placeholder="Ej: iPhone 11" />
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
            {(accessibility) => (
              <div className="min-w-0 space-y-2">
                {!editing && equiposLoading ? (
                  <p role="status" className="rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-text-2">
                    Cargando equipos…
                  </p>
                ) : !editing && equiposError ? (
                  <div role="alert" className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger-fg">
                    <span>No pudimos cargar los equipos.</span>
                    {onRetryEquipos ? (
                      <button type="button" className="min-h-11 rounded-md px-3 font-bold underline sm:min-h-0" onClick={onRetryEquipos}>
                        Reintentar
                      </button>
                    ) : null}
                  </div>
                ) : !editing && equipoOptions.length === 0 ? (
                  <p role="status" className="rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] font-semibold text-warning">
                    Primero cargá un equipo o usá “Cliente y equipo nuevos”.
                  </p>
                ) : null}
                <Controller
                  control={control}
                  name="equipoId"
                  render={({ field }) => (
                    <Combobox
                      ref={field.ref}
                      id="equipoId"
                      name={field.name}
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      onBlur={field.onBlur}
                      hasError={!!errors.equipoId}
                      aria-invalid={accessibility['aria-invalid']}
                      aria-describedby={accessibility['aria-describedby']}
                      aria-required={accessibility['aria-required']}
                      disabled={!!editing || equiposLoading || equiposError || equipoOptions.length === 0}
                      placeholder={equiposLoading ? 'Cargando equipos…' : 'Seleccioná un equipo'}
                      options={equipoOptions}
                    />
                  )}
                />
              </div>
            )}
          </FormField>
        )}

        <FormField label="Problema reportado" required error={errors.descripcionProblema?.message} htmlFor="descripcionProblema">
          <textarea
            id="descripcionProblema"
            rows={3}
            maxLength={255}
            {...register('descripcionProblema')}
            className={`${inputClass(!!errors.descripcionProblema)} resize-none`}
            placeholder="Ej: No carga, pantalla rota, no enciende…"
          />
        </FormField>

        {/* Estado, precios, fechas y detalles de ingreso: disponibles tanto al
            elegir un equipo existente como al cargar cliente+equipo nuevos. */}
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Estado" error={errors.estado?.message} htmlFor="estado">
                <select id="estado" {...register('estado')} className={inputClass(!!errors.estado)}>
                  {estadosDisponibles.map((e) => (
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
                {(accessibility) => (
                  <Controller
                    control={control}
                    name="precioEstimado"
                    render={({ field }) => (
                      <MoneyInput
                        ref={field.ref}
                        id="precioEstimado"
                        name={field.name}
                        value={field.value as number | ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        hasError={!!errors.precioEstimado}
                        aria-invalid={accessibility['aria-invalid']}
                        aria-describedby={accessibility['aria-describedby']}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label="Precio final" error={errors.precioFinal?.message} htmlFor="precioFinal">
                {(accessibility) => (
                  <Controller
                    control={control}
                    name="precioFinal"
                    render={({ field }) => (
                      <MoneyInput
                        ref={field.ref}
                        id="precioFinal"
                        name={field.name}
                        value={field.value as number | ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        hasError={!!errors.precioFinal}
                        aria-invalid={accessibility['aria-invalid']}
                        aria-describedby={accessibility['aria-describedby']}
                      />
                    )}
                  />
                )}
              </FormField>
            </div>

            <FormField label="Entrega estimada" error={errors.fechaEstimadaEntrega?.message} htmlFor="fechaEstimadaEntrega">
              <input id="fechaEstimadaEntrega" type="date" {...register('fechaEstimadaEntrega')} className={inputClass(!!errors.fechaEstimadaEntrega)} />
            </FormField>

            {/* Orden de trabajo (opcional, colapsable) */}
            <details ref={detallesRef} className="rounded-xl border border-border bg-surface-2 p-4">
              <summary className="-m-2 flex min-h-11 cursor-pointer touch-manipulation items-center rounded-lg p-2 text-[13px] font-extrabold text-text-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:min-h-0">
                Detalles de ingreso (opcional)
              </summary>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Patrón de desbloqueo" htmlFor="patronDesbloqueo">
                    <input id="patronDesbloqueo" type="text" maxLength={60} autoComplete="off" spellCheck={false} {...register('patronDesbloqueo')} className={inputClass()} placeholder="Ej: L invertida" />
                  </FormField>
                  <FormField label="PIN / contraseña" htmlFor="pinDesbloqueo">
                    <input id="pinDesbloqueo" type="text" maxLength={20} autoComplete="off" spellCheck={false} {...register('pinDesbloqueo')} className={inputClass()} placeholder="Ej: 1234" />
                  </FormField>
                </div>
                <FormField label="Accesorios que deja" htmlFor="accesorios">
                  <input id="accesorios" type="text" maxLength={255} {...register('accesorios')} className={inputClass()} placeholder="Cargador, funda, SIM…" />
                </FormField>
                <FormField label="Condiciones de ingreso" htmlFor="condicionesIngreso">
                  <textarea id="condicionesIngreso" rows={2} maxLength={500} {...register('condicionesIngreso')} className={`${inputClass()} resize-none`} placeholder="Rayones, golpes, etc." />
                </FormField>

                {/* Riesgos del ingreso: definen garantía limitada y la bandera de cuenta vinculada */}
                <div className="space-y-3 border-t border-border pt-3.5">
                  <div className="text-[12px] font-extrabold uppercase tracking-wide text-text-3">Riesgos del ingreso</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex min-h-11 touch-manipulation items-center gap-2 text-[13.5px] font-semibold text-text-2 sm:min-h-0">
                      <input type="checkbox" {...register('mojado')} className="h-5 w-5 shrink-0 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]" />
                      Mojado / cayó al agua
                    </label>
                    <label className="flex min-h-11 touch-manipulation items-center gap-2 text-[13.5px] font-semibold text-text-2 sm:min-h-0">
                      <input type="checkbox" {...register('trabajoEnPlaca')} className="h-5 w-5 shrink-0 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]" />
                      Trabajo en placa
                    </label>
                    <label className="flex min-h-11 touch-manipulation items-center gap-2 text-[13.5px] font-semibold text-text-2 sm:min-h-0">
                      <input type="checkbox" {...register('noTesteableAlIngreso')} className="h-5 w-5 shrink-0 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]" />
                      No testeable al ingreso
                    </label>
                    <label className="flex min-h-11 touch-manipulation items-center gap-2 text-[13.5px] font-semibold text-text-2 sm:min-h-0">
                      <input type="checkbox" {...register('tieneBloqueoPantalla')} className="h-5 w-5 shrink-0 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]" />
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
                      <label className="flex min-h-11 touch-manipulation items-center gap-2 text-[13.5px] font-semibold text-text-2 sm:mb-2 sm:min-h-0">
                        <input type="checkbox" {...register('clienteConoceCredenciales')} className="h-5 w-5 shrink-0 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]" />
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
                  <textarea id="observaciones" rows={2} maxLength={1000} {...register('observaciones')} className={`${inputClass()} resize-none`} placeholder="Notas privadas (no se muestran al cliente)" />
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
                <div className="grid grid-cols-1 gap-4 border-t border-border pt-3.5 sm:grid-cols-2">
                  <FormField label="Garantía (días)" error={errors.garantiaDias?.message} htmlFor="garantiaDias">
                    <input
                      id="garantiaDias"
                      type="number"
                      min="1"
                      step="1"
                      {...register('garantiaDias', { valueAsNumber: true })}
                      className={inputClass(!!errors.garantiaDias)}
                      placeholder="90 (default del sistema)"
                    />
                  </FormField>
                  <FormField label="Condiciones de garantía" htmlFor="garantiaCondiciones">
                    <input
                      id="garantiaCondiciones"
                      type="text"
                      {...register('garantiaCondiciones')}
                      className={inputClass()}
                      placeholder="Ej: cubre solo el repuesto cambiado"
                    />
                  </FormField>
                </div>

                <FormField label="Fotos del ingreso" htmlFor="fotosIngreso">
                  <Controller
                    control={control}
                    name="fotosIngreso"
                    render={({ field }) => (
                      <FotoUploader
                        id="fotosIngreso"
                        value={field.value}
                        onChange={field.onChange}
                        onUploadingChange={setSubiendoFotosIngreso}
                        disabled={saving}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Fotos post-reparación" htmlFor="fotosPost">
                  <Controller
                    control={control}
                    name="fotosPost"
                    render={({ field }) => (
                      <FotoUploader
                        id="fotosPost"
                        value={field.value}
                        onChange={field.onChange}
                        onUploadingChange={setSubiendoFotosPost}
                        disabled={saving}
                      />
                    )}
                  />
                </FormField>
              </div>
            </details>
        </div>

      </form>
    </Modal>
  );
};
