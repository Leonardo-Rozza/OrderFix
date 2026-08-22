import { useParams, useNavigate } from 'react-router';
import { Logo } from '../components/Logo';
import { Loader } from '../components/Loader';
import { btnGhost, btnPrimary } from '../components/ui';
import { formatMoney, formatDate } from '../utils/format';
import { useReciboQuery } from '../api/queries/cobros.queries';

export const ReciboPage = () => {
  const { id } = useParams();
  const reparacionId = Number(id);
  const navigate = useNavigate();
  const { data: r, isLoading, isError } = useReciboQuery(reparacionId);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <Loader size="lg" />
      </div>
    );
  }

  if (isError || !r) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg px-6 text-center text-text">
        <div>
          <div className="text-[16px] font-extrabold">No se pudo cargar el recibo</div>
          <button className={`${btnGhost} mt-4`} onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8 text-text">
      <div className="mx-auto max-w-[620px] px-5">
        {/* Barra de acciones (no se imprime) */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <button className={btnGhost} onClick={() => navigate(-1)}>
            ← Volver
          </button>
          <button className={btnPrimary} onClick={() => window.print()}>
            Imprimir
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm print:border-0 print:shadow-none">
          <div className="flex items-start justify-between border-b border-border pb-5">
            <div>
              <Logo size={34} />
              <div className="mt-2 text-[15px] font-extrabold">{r.tallerNombre}</div>
              {r.tallerTelefono && <div className="mt-1 text-[12.5px] text-text-3">Tel: {r.tallerTelefono}</div>}
            </div>
            <div className="text-right">
              <div className="text-[12.5px] font-extrabold uppercase tracking-wide text-text-3">Recibo</div>
              <div className="mt-1 text-[13px] text-text-2">{formatDate(r.fecha)}</div>
              <div className="font-mono text-[12px] text-text-3">Orden #{r.reparacionId}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-5 text-[13.5px]">
            <div>
              <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">Cliente</div>
              <div className="mt-1 font-semibold">
                {r.clienteNombre} {r.clienteApellido}
              </div>
              {r.clienteTelefono && <div className="font-mono text-text-3">{r.clienteTelefono}</div>}
            </div>
            <div>
              <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">Equipo</div>
              <div className="mt-1 font-semibold">
                {r.equipoMarca} {r.equipoModelo}
              </div>
              <div className="text-text-3">{r.descripcionProblema}</div>
            </div>
          </div>

          {/* Repuestos */}
          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
              <span>Detalle</span>
              <span>Subtotal</span>
            </div>
            {r.repuestos.map((it, i) => (
              <div key={i} className="flex justify-between py-1 text-[13.5px]">
                <span>
                  {it.cantidad}× {it.nombre}
                </span>
                <span className="font-mono">{formatMoney(it.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1 text-[13.5px]">
              <span>Mano de obra</span>
              <span className="font-mono">{formatMoney(r.manoDeObra)}</span>
            </div>
          </div>

          {/* Totales */}
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-[14px]">
            <div className="flex justify-between text-text-2">
              <span>Repuestos</span>
              <span className="font-mono">{formatMoney(r.totalRepuestos)}</span>
            </div>
            <div className="flex justify-between text-[16px] font-extrabold">
              <span>Total</span>
              <span className="font-mono">{formatMoney(r.total)}</span>
            </div>
            <div className="flex justify-between text-text-2">
              <span>Cobrado</span>
              <span className="font-mono text-success">{formatMoney(r.cobrado)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Saldo</span>
              <span className="font-mono">{formatMoney(r.saldo)}</span>
            </div>
          </div>

          <div className="mt-5 text-center text-[13px] font-bold">
            {r.pagado ? '✓ Pagado' : 'Pendiente de pago'}
          </div>
        </div>
      </div>
    </div>
  );
};
