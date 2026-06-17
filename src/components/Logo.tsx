interface LogoProps {
  /** Tamaño del cuadrado del ícono en px */
  size?: number;
  /** Mostrar el wordmark "OrdenFix" al lado */
  withText?: boolean;
  /** Clases extra para el contenedor */
  className?: string;
}

/** Marca OrdenFix: ícono de llave inglesa sobre fondo primary + wordmark opcional. */
export const Logo = ({ size = 38, withText = true, className = '' }: LogoProps) => {
  const icon = Math.round(size * 0.55);
  return (
    <div className={`flex items-center gap-3 font-extrabold tracking-tight ${className}`}>
      <div
        className="grid place-items-center rounded-xl bg-primary shadow-sm"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 24 24"
          width={icon}
          height={icon}
          fill="none"
          stroke="var(--primary-fg)"
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a4 4 0 0 0-5.66 5.66L3 18l3 3 6.04-6.04a4 4 0 0 0 5.66-5.66l-2.83 2.83-2.83-2.83 2.83-2.83z" />
        </svg>
      </div>
      {withText && <span className="text-[20px]">OrdenFix</span>}
    </div>
  );
};
