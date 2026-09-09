import { z } from 'zod';
import type { RegisterRequest } from '../types';
import { parseRetryAfter } from '../utils/retryAfter';
import { publicClient } from './axios';

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const documentSchema = z.object({
  id: uuid,
  tipo: z.enum(['TERMINOS_SERVICIO', 'POLITICA_PRIVACIDAD', 'ACUERDO_TRATAMIENTO_DATOS',
    'CONDICIONES_PRO', 'POLITICA_CANCELACIONES_REEMBOLSOS', 'POLITICA_CIERRE_CUENTA',
    'AVISO_CLIENTES_TALLER', 'TERMINOS_USUARIO', 'AVISO_PRIVACIDAD_USUARIO',
    'COMPROMISO_CONFIDENCIALIDAD', 'ATESTACION_DATOS_CLIENTE']),
  version: z.string().min(1),
  titulo: z.string().min(1),
  contenidoMarkdown: z.string().min(1).max(1_048_576),
  sha256: digest,
  vigenteDesde: z.string().min(1),
  estado: z.literal('VIGENTE'),
  locale: z.literal('es-AR'),
});

const requirementSchema = z.object({
  id: uuid,
  contexto: z.literal('REGISTRO'),
  tipoActo: z.enum(['ACEPTACION', 'LECTURA', 'DECLARACION']),
  afirmacion: z.string().min(1).max(2000).refine((value) => [...value].length <= 1000),
  afirmacionSha256: digest,
  documentos: z.array(documentSchema).min(1).max(16)
    .refine((documents) => new Set(documents.map((document) => document.id)).size === documents.length),
  requerido: z.boolean(),
});

const requirementsSchema = z.object({
  contexto: z.literal('REGISTRO'),
  locale: z.literal('es-AR'),
  requiredSetRevision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  requisitos: z.array(requirementSchema).min(1).max(2048)
    .refine((requirements) => requirements.some((requirement) => requirement.requerido))
    .refine((requirements) => new Set(requirements.map((requirement) => requirement.id)).size === requirements.length),
});

export type RegistrationRequirements = z.infer<typeof requirementsSchema>;
export type RegistrationAcceptance = {
  requisitoVersionId: string;
  tipoActo: 'ACEPTACION' | 'LECTURA' | 'DECLARACION';
  afirmacionSha256: string;
  documentos: Array<{ documentoVersionId: string; sha256: string }>;
  confirmado: true;
};
export type RegistrationAttempt = {
  idempotencyKey: string;
  payload: RegisterRequest & {
    requiredSetRevision: string;
    aceptacionesLegales: RegistrationAcceptance[];
  };
};

export const registrationConsentMode = (): 'legacy' | 'consent' | 'invalid' => {
  const value: unknown = import.meta.env.VITE_REGISTRATION_CONSENT;
  if (value === undefined || value === 'false') return 'legacy';
  return value === 'true' ? 'consent' : 'invalid';
};

export const parseRegistrationRequirements = (value: unknown): RegistrationRequirements => {
  const result = requirementsSchema.safeParse(value);
  if (!result.success) throw new Error('No pudimos verificar las condiciones de registro.');
  return result.data;
};

export const getRegistrationRequirements = async (signal: AbortSignal): Promise<RegistrationRequirements> => {
  const { data } = await publicClient.get<unknown>('/public/requisitos-legales', {
    params: { contexto: 'REGISTRO', locale: 'es-AR' }, signal, timeout: 20_000,
  });
  return parseRegistrationRequirements(data);
};

export const createRegistrationAttempt = (
  registration: RegisterRequest,
  snapshot: RegistrationRequirements,
  confirmed: ReadonlySet<string>,
): RegistrationAttempt => {
  if (snapshot.requisitos.some((requirement) => requirement.requerido && !confirmed.has(requirement.id))) {
    throw new Error('Revisá y confirmá las condiciones obligatorias.');
  }
  // El snapshot y sus digests se reenvían exactamente; el cliente no calcula revisiones.
  return {
    idempotencyKey: crypto.randomUUID(),
    payload: {
      ...registration,
      requiredSetRevision: snapshot.requiredSetRevision,
      aceptacionesLegales: snapshot.requisitos.filter((requirement) => confirmed.has(requirement.id)).map((requirement) => ({
        requisitoVersionId: requirement.id,
        tipoActo: requirement.tipoActo,
        afirmacionSha256: requirement.afirmacionSha256,
        documentos: requirement.documentos.map((document) => ({ documentoVersionId: document.id, sha256: document.sha256 })),
        confirmado: true,
      })),
    },
  };
};

type RegistrationErrorResponse = { status?: number; data?: { code?: string }; headers?: unknown };
export const registrationErrorResponse = (error: unknown): RegistrationErrorResponse | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: RegistrationErrorResponse }).response;
};

/** Adapta únicamente el 409 contractual al contador existente; login conserva su política. */
export const registrationRetryError = (error: unknown): unknown => {
  const response = registrationErrorResponse(error);
  if (response?.status !== 409 || response.data?.code !== 'IDEMPOTENCY_EN_PROGRESO') return error;
  const headers = response.headers as { get?: (name: string) => unknown; [name: string]: unknown } | undefined;
  const value = typeof headers?.get === 'function' ? headers.get('retry-after')
    : headers?.['retry-after'] ?? headers?.['Retry-After'];
  return { response: { status: 429, headers: { 'retry-after': parseRetryAfter(value) ?? 1 } } };
};
