import type { ReactNode } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import { LimitePlanModal } from '../components/LimitePlanModal';
import { EmailVerificacionBanner } from '../components/EmailVerificacionBanner';

interface DashboardLayoutProps {
  children: ReactNode;
  /** Título mostrado en la barra superior (desktop) */
  title?: string;
}

export const DashboardLayout = ({ children, title }: DashboardLayoutProps) => (
  <div className="min-h-screen bg-bg text-text">
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-[14px] focus:font-bold focus:text-primary-fg focus:shadow-lg"
    >
      Saltar al contenido
    </a>
    <Sidebar />
    <div className="flex min-h-screen flex-col lg:pl-64">
      <EmailVerificacionBanner />
      <Navbar title={title} />
      <main id="contenido" tabIndex={-1} className="flex-1 px-4 py-5 outline-none lg:px-6 lg:py-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <BottomNav />
    </div>
    <LimitePlanModal />
  </div>
);
