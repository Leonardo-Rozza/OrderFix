import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
  /** Sección futura: se muestra deshabilitada */
  soon?: boolean;
  /** Aparece en la barra inferior mobile */
  mobile?: boolean;
}

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const navItems: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    mobile: true,
    icon: <Svg><path d="M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z" /></Svg>,
  },
  {
    key: 'reparaciones',
    label: 'Reparaciones',
    path: '/reparaciones',
    mobile: true,
    icon: <Svg><path d="M14.7 6.3a4 4 0 0 0-5.66 5.66L3 18l3 3 6.04-6.04a4 4 0 0 0 5.66-5.66l-2.83 2.83-2.83-2.83 2.83-2.83z" /></Svg>,
  },
  {
    key: 'clientes',
    label: 'Clientes',
    path: '/clientes',
    mobile: true,
    icon: <Svg><path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 19v-1.4a3.5 3.5 0 0 0-2.6-3.4M15 4.2a3.5 3.5 0 0 1 0 6.6" /></Svg>,
  },
  {
    key: 'equipos',
    label: 'Equipos',
    path: '/equipos',
    mobile: true,
    icon: <Svg><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></Svg>,
  },
  {
    key: 'repuestos',
    label: 'Repuestos',
    path: '/repuestos',
    icon: <Svg><path d="m7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8M12 13v8" /></Svg>,
  },
  {
    key: 'planes',
    label: 'Plan',
    path: '/planes',
    mobile: true,
    icon: <Svg><path d="m12 3 2.4 5 5.6.8-4 3.9.9 5.5L12 21l-4.9-2.8.9-5.5-4-3.9 5.6-.8z" /></Svg>,
  },
  // Secciones futuras (roadmap) — deshabilitadas
  { key: 'caja', label: 'Caja', path: '#', soon: true, icon: <Svg><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M16 14h2" /></Svg> },
  { key: 'inventario', label: 'Inventario', path: '#', soon: true, icon: <Svg><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" /></Svg> },
  { key: 'reportes', label: 'Reportes', path: '#', soon: true, icon: <Svg><path d="M3 3v18h18M8 14v4M13 9v9M18 6v12" /></Svg> },
];

export const mobileNavItems = navItems.filter((n) => n.mobile && !n.soon);
