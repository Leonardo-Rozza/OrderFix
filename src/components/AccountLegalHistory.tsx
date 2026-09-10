import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAccountLegalHistory, getHistoricalLegalDocument,
  type AccountLegalHistoryPage, type HistoricalLegalDocumentReference,
} from '../api/accountLegal';
import { btnGhost, card } from './ui';

type Acceptance = AccountLegalHistoryPage['content'][number];
const actLabels: Record<Acceptance['tipoActo'], string> = {
  ACEPTACION: 'Aceptación', LECTURA: 'Lectura', DECLARACION: 'Declaración',
};
const contextLabels: Record<Acceptance['contexto'], string> = {
  REGISTRO: 'Registro de cuenta', PRIMER_INGRESO_EMPLEADO: 'Primer ingreso como empleado',
  USO_CONTINUADO: 'Uso de OrdenFix', CONTRATACION_PRO: 'Contratación PRO', ATESTACION_FOTOS: 'Autorización de fotos',
  ATESTACION_CREDENCIALES: 'Autorización de credenciales', CIERRE_CUENTA: 'Cierre de cuenta', ARREPENTIMIENTO: 'Arrepentimiento',
};
const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' });

const HistoricalDocument = ({ document, scope }: { document: HistoricalLegalDocumentReference; scope: string }) => {
  const query = useQuery({
    queryKey: ['account-legal-document', scope, document],
    queryFn: ({ signal }) => getHistoricalLegalDocument(document, signal),
    gcTime: 0, staleTime: 0, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  if (query.isPending || query.isFetching) return <p role="status" className="text-sm">Cargando la versión del documento…</p>;
  if (query.isError) return <div className="space-y-2">
    <p role="alert" className="text-sm text-danger-fg">No pudimos leer y verificar esta versión. El documento puede no estar disponible; podés reintentar.</p>
    <button type="button" className={btnGhost} onClick={() => void query.refetch()}>Reintentar documento</button>
  </div>;
  return <div className="min-w-0 space-y-2">
    <p className="text-xs font-semibold text-text-3">
      {query.data.estado === 'VIGENTE' ? 'Versión vigente' : query.data.estado === 'REEMPLAZADA' ? 'Versión reemplazada' : 'Versión retirada'}
      {' · '}Versión {query.data.version}
    </p>
    {/* Como en el registro, el Markdown completo se muestra como texto: no activa HTML ni enlaces. */}
    <div role="region" aria-label={`${document.titulo} · versión ${document.version}`} tabIndex={0}
      className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-2 p-3 text-sm leading-6 text-text [overflow-wrap:anywhere]">
      {query.data.contenidoMarkdown}
    </div>
  </div>;
};

/** Historial del principal actual. La página de Cuenta monta una instancia nueva por sesión validada. */
export const AccountLegalHistory = () => {
  const scope = useId();
  const [page, setPage] = useState(0);
  const [opened, setOpened] = useState<{ acceptanceId: string; document: HistoricalLegalDocumentReference } | null>(null);
  const query = useQuery({
    queryKey: ['account-legal-history', scope, page],
    queryFn: ({ signal }) => getAccountLegalHistory(page, signal),
    gcTime: 0, staleTime: 0, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const changePage = (next: number) => { setOpened(null); setPage(next); };
  const loading = query.isPending || query.isFetching;
  const data = !loading && !query.isError ? query.data : undefined;

  return <section aria-labelledby={`${scope}-title`} className={`${card} min-w-0 space-y-4 p-4 sm:p-5`}>
    <div className="space-y-1">
      <h2 id={`${scope}-title`} className="text-base font-extrabold">Tu historial legal</h2>
      <p className="text-sm text-text-2">Consultá las aceptaciones, lecturas y declaraciones registradas por tu usuario, con la versión de cada documento.</p>
    </div>
    {loading && <p role="status" className="text-sm">Cargando tu historial legal…</p>}
    {!loading && query.isError && <div className="space-y-2">
      <p role="alert" className="text-sm text-danger-fg">No pudimos consultar tu historial legal. La consulta puede no estar disponible; este error no indica que no tengas registros.</p>
      <button type="button" className={btnGhost} onClick={() => { setOpened(null); void query.refetch(); }}>Reintentar historial</button>
    </div>}
    {data?.page.totalElements === 0 && <p className="text-sm text-text-2">No hay registros legales para tu usuario.</p>}
    {data && data.page.totalElements > 0 && data.content.length === 0 && <p className="text-sm text-text-2">Esta página ya no tiene registros. Volvé a la página anterior.</p>}
    {data?.content.map((acceptance) => <article key={acceptance.id} className="min-w-0 space-y-3 border-t border-border pt-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold">{actLabels[acceptance.tipoActo]} · {contextLabels[acceptance.contexto]}</h3>
        <p className="text-xs text-text-3">Registrada el <time dateTime={acceptance.aceptadoEn}>{dateFormat.format(new Date(acceptance.aceptadoEn))}</time></p>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-text-2 [overflow-wrap:anywhere]">{acceptance.afirmacion}</p>
      {acceptance.documentos.map((document) => {
        const isOpen = opened?.acceptanceId === acceptance.id && opened.document.documentoVersionId === document.documentoVersionId;
        return <div key={document.documentoVersionId} className="min-w-0 space-y-3">
          <button type="button" className={`${btnGhost} max-w-full text-left [overflow-wrap:anywhere]`} aria-expanded={isOpen}
            onClick={() => setOpened(isOpen ? null : { acceptanceId: acceptance.id, document })}>
            {isOpen ? 'Cerrar' : 'Leer'} {document.titulo} · versión {document.version}
          </button>
          {isOpen && <HistoricalDocument key={`${acceptance.id}:${document.documentoVersionId}`} document={document} scope={scope} />}
        </div>;
      })}
    </article>)}
    <nav aria-label="Páginas del historial legal" className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <button type="button" className={btnGhost} disabled={page === 0} onClick={() => changePage(page - 1)}>Anterior</button>
      <span className="text-sm text-text-2">Página {page + 1}{data && data.page.totalPages > 0 ? ` de ${data.page.totalPages}` : ''}</span>
      <button type="button" className={btnGhost} disabled={!data || page + 1 >= data.page.totalPages || page >= 2_147_483_647}
        onClick={() => changePage(page + 1)}>Siguiente</button>
    </nav>
  </section>;
};
