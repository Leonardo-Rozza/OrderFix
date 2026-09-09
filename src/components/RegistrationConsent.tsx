import type { useRegistrationConsent } from '../hooks/useRegistrationConsent';

type Props = { consent: ReturnType<typeof useRegistrationConsent>; disabled: boolean };

export const RegistrationConsent = ({ consent, disabled }: Props) => (
  <fieldset className="space-y-3 rounded-lg border border-border-strong p-4" disabled={disabled}>
    <legend className="px-1 text-sm font-bold">Condiciones de tu cuenta</legend>
    <p className="text-sm text-text-2">Leé los documentos y confirmá cada afirmación obligatoria para crear tu taller.</p>
    {consent.loading && <p role="status" className="text-sm text-text-2">Cargando condiciones…</p>}
    {consent.loadError && <p role="alert" className="text-sm text-danger-fg">No pudimos cargar las condiciones. El registro estará disponible cuando podamos verificarlas.</p>}
    {consent.snapshot?.requisitos.map((requirement) => (
      <div key={requirement.id} className="space-y-2 border-t border-border-strong pt-3">
        {requirement.documentos.map((document) => (
          <details key={document.id} className="rounded-md bg-surface-2 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-primary">
              Leer {document.titulo} · versión {document.version}
            </summary>
            {/* Texto completo de la versión recibida; Markdown visible, nunca HTML activo. */}
            <div className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-text" tabIndex={0} role="region" aria-label={document.titulo}>
              {document.contenidoMarkdown}
            </div>
          </details>
        ))}
        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-5">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary"
            checked={consent.confirmed.has(requirement.id)}
            onChange={(event) => consent.confirm(requirement.id, event.target.checked)} />
          <span>{requirement.afirmacion} <span className="text-text-3">({requirement.requerido ? 'obligatoria' : 'opcional'})</span></span>
        </label>
      </div>
    ))}
    {!consent.loading && <button type="button" disabled={disabled || consent.retry.isCoolingDown}
      onClick={() => { void consent.reload(); }} className="min-h-11 text-sm font-semibold text-primary underline disabled:opacity-60">
      {consent.retry.isCoolingDown ? `Reintentá en ${consent.retry.secondsRemaining} s` : consent.loadError ? 'Reintentar condiciones' : 'Revisar condiciones nuevamente'}
    </button>}
  </fieldset>
);
