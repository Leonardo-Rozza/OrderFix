import { z } from 'zod';
import { apiClient, publicClient } from './axios';

export const ACCOUNT_LEGAL_PAGE_SIZE = 20;
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const instant = z.iso.datetime({ precision: undefined }).refine((value) => Number.isFinite(Date.parse(value)));
const documentType = z.enum(['TERMINOS_SERVICIO', 'POLITICA_PRIVACIDAD', 'ACUERDO_TRATAMIENTO_DATOS',
  'CONDICIONES_PRO', 'POLITICA_CANCELACIONES_REEMBOLSOS', 'POLITICA_CIERRE_CUENTA', 'AVISO_CLIENTES_TALLER',
  'TERMINOS_USUARIO', 'AVISO_PRIVACIDAD_USUARIO', 'COMPROMISO_CONFIDENCIALIDAD', 'ATESTACION_DATOS_CLIENTE']);
const text = (maximum: number) => z.string().min(1).max(maximum * 2)
  .refine((value) => [...value].length <= maximum && value.trim().length > 0);
const documentReferenceSchema = z.object({
  documentoVersionId: uuid, tipo: documentType, version: text(40), titulo: text(300), sha256: digest,
});
const acceptanceSchema = z.object({
  id: uuid, requisitoVersionId: uuid,
  contexto: z.enum(['REGISTRO', 'PRIMER_INGRESO_EMPLEADO', 'USO_CONTINUADO', 'CONTRATACION_PRO',
    'ATESTACION_FOTOS', 'ATESTACION_CREDENCIALES', 'CIERRE_CUENTA', 'ARREPENTIMIENTO']),
  tipoActo: z.enum(['ACEPTACION', 'LECTURA', 'DECLARACION']),
  afirmacion: text(1000), afirmacionSha256: digest,
  documentos: z.array(documentReferenceSchema).min(1).max(16)
    .refine((documents) => new Set(documents.map((document) => document.documentoVersionId)).size === documents.length),
  aceptadoEn: instant,
});
const historySchema = z.object({
  content: z.array(acceptanceSchema).max(ACCOUNT_LEGAL_PAGE_SIZE),
  page: z.object({
    size: z.literal(ACCOUNT_LEGAL_PAGE_SIZE), number: z.number().int().min(0).max(2_147_483_647),
    totalElements: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    totalPages: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  }),
}).refine(({ content, page }) => {
  const expected = Math.max(0, Math.min(page.size, page.totalElements - page.number * page.size));
  return content.length === expected && page.totalPages === Math.ceil(page.totalElements / page.size)
    && new Set(content.map((item) => item.id)).size === content.length
    && new Set(content.map((item) => item.requisitoVersionId)).size === content.length;
});
const documentSchema = z.object({
  id: uuid, tipo: documentType, version: text(64), titulo: text(300), sha256: digest,
  contenidoMarkdown: z.string().min(1).max(1_048_576), vigenteDesde: instant,
  estado: z.enum(['VIGENTE', 'REEMPLAZADA', 'RETIRADA']), locale: z.literal('es-AR'),
});

export type AccountLegalHistoryPage = z.infer<typeof historySchema>;
export type HistoricalLegalDocumentReference = z.infer<typeof documentReferenceSchema>;
export type HistoricalLegalDocument = z.infer<typeof documentSchema>;

/** El actor lo resuelve la sesión del backend; no admite selección de usuario o taller. */
export const getAccountLegalHistory = async (page: number, signal: AbortSignal): Promise<AccountLegalHistoryPage> => {
  if (!Number.isInteger(page) || page < 0 || page > 2_147_483_647) throw new Error('La página del historial no es válida.');
  const { data } = await apiClient.get<unknown>('/aceptaciones-legales', {
    params: { page, size: ACCOUNT_LEGAL_PAGE_SIZE }, signal, timeout: 20_000, errorMode: 'inline', sessionValidation: 'profile',
  });
  signal.throwIfAborted();
  const parsed = historySchema.safeParse(data);
  if (!parsed.success || parsed.data.page.number !== page) throw new Error('No pudimos verificar el historial legal.');
  return parsed.data;
};

/** Lee la versión referenciada por la evidencia, nunca su reemplazo vigente. */
export const getHistoricalLegalDocument = async (
  expected: HistoricalLegalDocumentReference, signal: AbortSignal,
): Promise<HistoricalLegalDocument> => {
  const reference = documentReferenceSchema.safeParse(expected);
  if (!reference.success) throw new Error('No pudimos verificar la referencia del documento.');
  const { data } = await publicClient.get<unknown>(`/public/documentos-legales/${reference.data.documentoVersionId}`, {
    signal, timeout: 20_000,
  });
  signal.throwIfAborted();
  const parsed = documentSchema.safeParse(data);
  if (!parsed.success) throw new Error('No pudimos verificar la versión del documento.');
  const document = parsed.data;
  if (document.id !== expected.documentoVersionId || document.tipo !== expected.tipo
    || document.version !== expected.version || document.titulo !== expected.titulo || document.sha256 !== expected.sha256) {
    throw new Error('El documento no coincide con la versión de tu historial.');
  }
  const bytes = new TextEncoder().encode(document.contenidoMarkdown);
  if (bytes.length > 1_048_576) throw new Error('No pudimos verificar el contenido del documento.');
  const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (byte) => byte.toString(16).padStart(2, '0')).join('');
  signal.throwIfAborted();
  if (actual !== document.sha256) throw new Error('El contenido no coincide con la versión de tu historial.');
  return document;
};
