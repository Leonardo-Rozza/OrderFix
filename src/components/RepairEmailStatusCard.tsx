import { useRepairEmailNotification } from '../api/queries/repairEmail.queries';
import type { RepairEmailState } from '../api/repairEmail';
import { Loader } from './Loader';
import { btnGhost, card } from './ui';

const statuses: Record<RepairEmailState, { label: string; description: string; tone: string }> = {
  NO_EVENTO: { label: 'Sin aviso registrado', description: 'Esta reparación no tiene un aviso por email registrado.', tone: 'text-text-2 bg-surface-3' },
  DESHABILITADO: { label: 'Envío desactivado', description: 'Los avisos por email no están habilitados.', tone: 'text-text-2 bg-surface-3' },
  SIN_EMAIL: { label: 'Sin email válido', description: 'El aviso no se pudo enviar. Revisa el email del cliente y actualiza este estado.', tone: 'text-warning bg-warning-soft' },
  PENDIENTE: { label: 'Pendiente', description: 'El aviso está pendiente de procesamiento. Todavía no fue aceptado por el servicio de correo.', tone: 'text-text-2 bg-surface-3' },
  EN_CURSO: { label: 'En proceso', description: 'Hay un intento de envío en curso. No se puede iniciar otro.', tone: 'text-text-2 bg-surface-3' },
  ACEPTADO: { label: 'Aceptado por el servicio de correo', description: 'El servicio aceptó el aviso. Esto no confirma que haya llegado a la bandeja del cliente.', tone: 'text-success bg-success-soft' },
  FALLO_PREVIO: { label: 'No se pudo iniciar el envío', description: 'El envío falló antes de ser aceptado. El servidor determina cuándo es seguro reintentar.', tone: 'text-warning bg-warning-soft' },
  INCIERTO: { label: 'Resultado incierto', description: 'No se pudo confirmar el resultado. Para evitar duplicados, no se permite reenviar este aviso.', tone: 'text-warning bg-warning-soft' },
  UNKNOWN: { label: 'Estado no disponible', description: 'No se pudo interpretar el estado del aviso. Actualiza para consultar nuevamente.', tone: 'text-text-2 bg-surface-3' },
};

export const RepairEmailStatusCard = ({ repairId }: { repairId: number }) => {
  const notification = useRepairEmailNotification(repairId);
  const status = statuses[notification.status?.estado ?? 'UNKNOWN'];
  const busy = notification.isRefreshing || notification.isRetrying;

  return (
    <section aria-label="Notificación por email" className={`${card} p-5`}>
      <h2 className="text-[12px] font-extrabold uppercase tracking-wide text-text-3">Notificación por email</h2>
      <div className="mt-3" role="status" aria-live="polite" aria-atomic="true">
        {notification.isLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-text-2">
            <Loader size="sm" /><span>Consultando el estado del email…</span>
          </div>
        ) : notification.isError || !notification.isAvailable ? (
          <p className="text-[13px] leading-relaxed text-text-2">No se pudo consultar el estado del email. La reparación sigue disponible.</p>
        ) : (
          <>
            <span className={`inline-flex rounded-md px-2.5 py-1 text-[12px] font-bold ${status.tone}`}>{status.label}</span>
            <p className="mt-2 text-[13px] leading-relaxed text-text-2">{status.description}</p>
          </>
        )}
      </div>
      {notification.retryFailed ? (
        <p role="alert" className="mt-3 text-[13px] leading-relaxed text-warning">
          No se pudo confirmar el reintento. Actualiza el estado antes de intentar nuevamente.
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        <button type="button" className={`${btnGhost} w-full`} onClick={notification.refresh}
          disabled={busy || !notification.isAvailable}>
          {notification.isRefreshing ? 'Actualizando estado…' : 'Actualizar estado'}
        </button>
        {notification.canRetry || notification.isRetrying ? (
          <button type="button" className={`${btnGhost} w-full`} onClick={() => { void notification.retry(); }}
            disabled={busy || !notification.canRetry}>
            {notification.isRetrying ? 'Solicitando reintento…' : 'Reintentar email'}
          </button>
        ) : null}
      </div>
    </section>
  );
};
