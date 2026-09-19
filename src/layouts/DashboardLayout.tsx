import { useContext, type ReactNode } from 'react';
import { AccountProfileContext } from '../router/accountProfile';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import { LimitePlanModal } from '../components/LimitePlanModal';
import { EmailVerificacionBanner } from '../components/EmailVerificacionBanner';

interface DashboardLayoutProps {
  children: ReactNode;
  /** Título mostrado en la barra superior (desktop) */
  title?: string;
  /** Cuenta se valida por perfil y no consulta ni exige el estado comercial. */
  accountMode?: boolean;
  /** Las vistas operativas pueden aprovechar todo el ancho disponible. */
  wide?: boolean;
}

export const DashboardLayout = ({ children, title, accountMode = false, wide = false }: DashboardLayoutProps) => {
  const profile = useContext(AccountProfileContext);
  const restricted = profile?.accesoTaller === 'RESTRICTED';
  const previewMode = profile?.usuario.emailVerificado === false;
  const accountOnly = accountMode || restricted || previewMode;
  return (
  <div className="min-h-dvh bg-bg text-text">
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-[14px] focus:font-bold focus:text-primary-fg focus:shadow-lg"
    >
      Saltar al contenido
    </a>
    <Sidebar accountMode={accountOnly} restricted={restricted} previewMode={previewMode} />
    <div className="flex min-h-dvh flex-col lg:pl-64">
      <EmailVerificacionBanner />
      <Navbar title={title} restricted={restricted} />
      <main id="contenido" tabIndex={-1} className="flex-1 px-4 py-5 outline-none lg:px-6 lg:py-6">
        <div className={`mx-auto min-w-0 ${wide ? 'max-w-[1800px]' : 'max-w-6xl'}`}>{children}</div>
      </main>
      <BottomNav accountMode={accountOnly} restricted={restricted} previewMode={previewMode} />
    </div>
    {!accountOnly && <LimitePlanModal />}
  </div>
);
};
