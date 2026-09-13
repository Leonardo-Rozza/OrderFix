import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { AccountProfileContext } from '../router/accountProfile';
import type { Perfil } from '../types';
const flags = vi.hoisted(() => ({ enabled: true }));
vi.mock('../config/workshopClosure', () => ({ get workshopClosureEnabled() { return flags.enabled; } }));
vi.mock('../layouts/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../components/AccountLegalHistory', () => ({ AccountLegalHistory: () => <p>Historial propio</p> }));
import { AccountPage } from './AccountPage';
const profile: Perfil = { accesoTaller: 'RESTRICTED', usuario: { id: 1, username: 'Titular', email: 'titular@ordenfix.test', role: 'ADMIN' },
  taller: { id: 2, nombre: 'Taller Centro', telefono: null } };
const mount = () => render(<MemoryRouter><AccountProfileContext value={profile}><AccountPage /></AccountProfileContext></MemoryRouter>);
beforeEach(() => { flags.enabled = true; });
it('Cuenta restringida explica el acceso y sólo ofrece respaldos previos', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'El acceso al taller está restringido' })).toBeVisible();
  expect(screen.getByText(/Consultá un respaldo previo/)).toBeVisible();
  expect(screen.queryByText(/descargá el reporte Excel/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Cierre y restauración del taller' })).toHaveAttribute('href', '/cuenta/cierre');
});
it('flag apagado conserva contexto de restricción sin enlace o promesa de prórroga', () => {
  flags.enabled = false; mount();
  expect(screen.getByText(/Esto no modifica ni amplía el plazo/)).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Cierre y restauración del taller' })).not.toBeInTheDocument();
});
