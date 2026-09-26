import type { TipoEquipo } from '../types';

export const TIPOS_EQUIPO = ['CELULAR', 'TABLET', 'NOTEBOOK', 'CONSOLA', 'JOYSTICK', 'PC_ESCRITORIO', 'MONITOR', 'TV', 'OTRO'] as const;

export const TIPO_EQUIPO_LABEL: Record<TipoEquipo, string> = {
  CELULAR: 'Celular',
  TABLET: 'Tablet',
  NOTEBOOK: 'Notebook',
  CONSOLA: 'Consola',
  JOYSTICK: 'Joystick',
  PC_ESCRITORIO: 'PC de escritorio',
  MONITOR: 'Monitor',
  TV: 'TV',
  OTRO: 'Otro / sin clasificar',
};

/** Una respuesta anterior sin categoría nunca permite inferir el tipo por marca. */
export const tipoEquipoLabel = (tipo: TipoEquipo | undefined) => TIPO_EQUIPO_LABEL[tipo ?? 'OTRO'];

export const AYUDA_ACCESO_EQUIPO: Record<TipoEquipo, string> = {
  CELULAR: 'Si hace falta para probar el equipo, podés anotar un patrón o PIN de desbloqueo.',
  TABLET: 'Si hace falta para probar el equipo, puedes anotar un patrón o PIN de desbloqueo.',
  NOTEBOOK: 'Si hace falta para probar el equipo, podés anotar la contraseña o el PIN de acceso.',
  PC_ESCRITORIO: 'Si hace falta para probar el equipo, podés anotar la contraseña o el PIN de acceso.',
  CONSOLA: 'Si la consola tiene un código de acceso necesario para probarla, podés anotarlo.',
  JOYSTICK: 'Habitualmente no necesita datos de acceso. Complétalos solo si este equipo los requiere.',
  MONITOR: 'Habitualmente no necesita datos de acceso. Completalos sólo si este equipo los requiere.',
  TV: 'Si el TV tiene un PIN de bloqueo necesario para probarlo, podés anotarlo.',
  OTRO: 'Completá los datos de acceso sólo si hacen falta para probar este equipo.',
};
