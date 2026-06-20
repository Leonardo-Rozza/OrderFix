import type { ReactNode } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import { LimitePlanModal } from '../components/LimitePlanModal';

interface DashboardLayoutProps {
  children: ReactNode;
  /** Título mostrado en la barra superior (desktop) */
  title?: string;
}

export const DashboardLayout = ({ children, title }: DashboardLayoutProps) => (
  <div className="min-h-screen bg-bg text-text">
    <Sidebar />
    <div className="flex min-h-screen flex-col lg:pl-64">
      <Navbar title={title} />
      <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <BottomNav />
    </div>
    <LimitePlanModal />
  </div>
);
