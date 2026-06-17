import { Logo } from './Logo';

const features = ['Tablero por estado', 'Clientes y equipos', 'Avisos por WhatsApp'];

/** Panel de marca lateral para Login / Registro (oculto en mobile). */
export const AuthAside = () => (
  <div
    className="relative hidden min-h-screen flex-col justify-between overflow-hidden p-14 text-white lg:flex"
    style={{ background: 'linear-gradient(150deg,#0B6F66,#0D9488 55%,#12B3A3)' }}
  >
    <Logo size={40} />

    <div>
      <div className="max-w-[15ch] text-[38px] font-extrabold leading-[1.1] tracking-tight">
        Tu taller, ordenado de punta a punta.
      </div>
      <p className="mt-[18px] max-w-[38ch] text-[16px] leading-relaxed text-white/80">
        Cargá una reparación en segundos, seguí cada equipo por estado y avisá al cliente cuando está listo.
      </p>
      <div className="mt-7 flex flex-wrap gap-2.5">
        {features.map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-semibold"
          >
            {f}
          </span>
        ))}
      </div>
    </div>

    <div className="text-[13px] text-white/70">Hecho para talleres de Argentina y LatAm.</div>
  </div>
);
