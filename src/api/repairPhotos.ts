import { z } from 'zod';
import { apiClient } from './axios';
import type { RegistrationAcceptance } from './registrationConsent';
import type { MomentoFoto } from '../types';
import { parseRetryAfter } from '../utils/retryAfter';

export const PHOTO_MAX_BYTES = 8_000_000;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const documentSchema = z.object({
  id: uuid, tipo: z.string().min(1), version: z.string().min(1), titulo: z.string().min(1),
  contenidoMarkdown: z.string().min(1).max(1_048_576), sha256: digest,
  vigenteDesde: z.string().min(1), estado: z.literal('VIGENTE'), locale: z.literal('es-AR'),
});
const requirementSchema = z.object({
  id: uuid, contexto: z.enum(['USO_CONTINUADO', 'ATESTACION_FOTOS']), tipoActo: z.enum(['ACEPTACION', 'LECTURA', 'DECLARACION']),
  afirmacion: z.string().min(1).max(2000), afirmacionSha256: digest, requerido: z.boolean(),
  documentos: z.array(documentSchema).min(1).max(16)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length),
});
const requirementsSchema = z.object({
  locale: z.literal('es-AR'), requiredSetRevision: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  requisitos: z.array(requirementSchema).min(1).max(2048)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length)
    .refine((items) => items.some((item) => item.contexto === 'ATESTACION_FOTOS' && item.requerido)),
  limites: z.object({ maxBytes: z.number().int().positive().max(PHOTO_MAX_BYTES),
    mimeTypes: z.array(z.enum(PHOTO_MIME_TYPES)).min(1) }),
});
const intentSchema = z.object({
  id: uuid, estado: z.enum(['CREADA', 'AUTORIZADA', 'SUBIDA', 'ASOCIADA', 'EXPIRADA', 'FALLIDA', 'LIMPIEZA_PENDIENTE', 'ELIMINADA']),
  expiresAt: z.string().min(1), upload: z.object({ method: z.literal('PUT'), url: z.string() }).nullable(),
});
const photoSchema = z.object({
  id: uuid, momento: z.enum(['INGRESO', 'POST_REPARACION']), mimeType: z.enum(PHOTO_MIME_TYPES),
  bytes: z.number().int().positive().max(PHOTO_MAX_BYTES), sha256: digest, createdAt: z.string().min(1),
});
export type PhotoRequirements = z.infer<typeof requirementsSchema>;
export type PrivatePhoto = z.infer<typeof photoSchema>;
export type PhotoIntent = z.infer<typeof intentSchema>;
export type SelectedPhoto = { file: File; momento: MomentoFoto };
export type PhotoAttempt = {
  readonly key: string;
  readonly file: File;
  readonly payload: {
    nombre: string; mimeType: string; bytes: number; sha256: string; momento: MomentoFoto;
    requiredSetRevision: string; aceptacionesLegales: RegistrationAcceptance[];
    atestacion: { tipo: 'AUTORIZACION_DATOS_CLIENTE'; alcances: ['FOTOS']; confirmada: true };
  };
  intent?: PhotoIntent;
  completed?: PrivatePhoto;
};
export class PhotoIntentTerminalError extends Error {
  constructor() { super('La intención de foto finalizó. Revisá la autorización para iniciar otra carga.'); }
}
const unavailable = () => new Error('La carga de fotos privadas no está disponible. La orden se conserva.');
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw unavailable();
  return parsed.data;
};
export const validatePhotoFile = (file: File): void => {
  if (!PHOTO_MIME_TYPES.some((mime) => mime === file.type) || file.size < 1 || file.size > PHOTO_MAX_BYTES) {
    throw new Error('Elegí una imagen JPEG o PNG de hasta 8 MB.');
  }
};
const base = (repairId: number) => {
  if (!Number.isSafeInteger(repairId) || repairId <= 0) throw unavailable();
  return `/reparaciones/${repairId}`;
};
const options = (signal: AbortSignal) => ({ signal, errorMode: 'inline' as const });
export const getPhotoRequirements = async (repairId: number, signal: AbortSignal): Promise<PhotoRequirements> =>
  parse(requirementsSchema, (await apiClient.get(`${base(repairId)}/requisitos-fotos`, options(signal))).data);

export const preparePhotoAttempt = async (
  selected: SelectedPhoto, snapshot: PhotoRequirements, confirmed: ReadonlySet<string>,
): Promise<PhotoAttempt> => {
  validatePhotoFile(selected.file);
  if (selected.file.size > snapshot.limites.maxBytes || !snapshot.limites.mimeTypes.includes(selected.file.type as typeof PHOTO_MIME_TYPES[number])
    || snapshot.requisitos.some((item) => item.requerido && !confirmed.has(item.id))) throw unavailable();
  const hash = await crypto.subtle.digest('SHA-256', await selected.file.arrayBuffer());
  return {
    key: crypto.randomUUID(), file: selected.file,
    payload: {
      nombre: selected.file.name, mimeType: selected.file.type, bytes: selected.file.size,
      sha256: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''),
      momento: selected.momento, requiredSetRevision: snapshot.requiredSetRevision,
      aceptacionesLegales: snapshot.requisitos.filter((item) => confirmed.has(item.id)).map((item) => ({
        requisitoVersionId: item.id, tipoActo: item.tipoActo, afirmacionSha256: item.afirmacionSha256,
        documentos: item.documentos.map((doc) => ({ documentoVersionId: doc.id, sha256: doc.sha256 })), confirmado: true,
      })),
      atestacion: { tipo: 'AUTORIZACION_DATOS_CLIENTE', alcances: ['FOTOS'], confirmada: true },
    },
  };
};

/** El caller conserva el mismo objeto incluso si se pierde una respuesta. */
export const uploadPhotoAttempt = async (repairId: number, attempt: PhotoAttempt, signal: AbortSignal): Promise<PrivatePhoto> => {
  if (attempt.completed) return attempt.completed;
  const path = `${base(repairId)}/cargas-foto`;
  signal.throwIfAborted();
  if (!attempt.intent) {
    attempt.intent = parse(intentSchema, (await apiClient.post(path, attempt.payload,
      { ...options(signal), headers: { 'Idempotency-Key': attempt.key } })).data);
  } else {
    const expectedId = attempt.intent.id;
    const current = parse(intentSchema, (await apiClient.get(`${path}/${expectedId}`, options(signal))).data);
    if (current.id !== expectedId) throw unavailable();
    attempt.intent = current;
  }
  const intent = attempt.intent;
  const contentPath = `${path}/${intent.id}/contenido`;
  if (intent.estado === 'AUTORIZADA' || intent.estado === 'SUBIDA') {
    if (intent.estado === 'AUTORIZADA') {
      // Nunca enviar el Bearer a una URL elegida por una respuesta externa.
      if (!intent.upload || intent.upload.url !== `/api${contentPath}`) throw unavailable();
      attempt.intent = parse(intentSchema, (await apiClient.put(contentPath, attempt.file,
        { ...options(signal), headers: { 'Content-Type': attempt.file.type } })).data);
      if (attempt.intent.estado !== 'SUBIDA') throw unavailable();
    }
  } else if (['EXPIRADA', 'FALLIDA', 'LIMPIEZA_PENDIENTE', 'ELIMINADA'].includes(intent.estado)) {
    throw new PhotoIntentTerminalError();
  } else if (intent.estado !== 'ASOCIADA') {
    throw unavailable();
  }
  const photo = parse(photoSchema, (await apiClient.post(`${path}/${intent.id}/finalizaciones`, undefined, options(signal))).data);
  if (photo.id !== intent.id || photo.momento !== attempt.payload.momento || photo.mimeType !== attempt.payload.mimeType
    || photo.bytes !== attempt.payload.bytes || photo.sha256 !== attempt.payload.sha256) throw unavailable();
  attempt.completed = photo;
  return photo;
};
export const listPrivatePhotos = async (repairId: number, signal: AbortSignal): Promise<PrivatePhoto[]> =>
  parse(z.array(photoSchema), (await apiClient.get(`${base(repairId)}/fotos`, options(signal))).data);
export const getPrivatePhoto = async (repairId: number, photoId: string, signal: AbortSignal): Promise<Blob> => {
  parse(uuid, photoId);
  return (await apiClient.get<Blob>(`${base(repairId)}/fotos/${photoId}/contenido`, {
    ...options(signal), responseType: 'blob', headers: { 'Cache-Control': 'no-store' },
  })).data;
};
export const deletePrivatePhoto = async (repairId: number, photoId: string, signal: AbortSignal): Promise<void> => {
  parse(uuid, photoId);
  await apiClient.delete(`${base(repairId)}/fotos/${photoId}`, options(signal));
};
export const photoErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  const response = error.response as { data?: { code?: unknown } } | undefined;
  return typeof response?.data?.code === 'string' ? response.data.code : undefined;
};

export const photoRetryAfterSeconds = (error: unknown): number => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return 1;
  const response = error.response as { headers?: { get?: (name: string) => unknown; [name: string]: unknown } } | undefined;
  const headers = response?.headers;
  const value = typeof headers?.get === 'function' ? headers.get('retry-after')
    : headers?.['retry-after'] ?? headers?.['Retry-After'];
  return parseRetryAfter(value) ?? 1;
};
