import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ExportExcelButton } from './ExportExcelButton';
import { authStore } from '../store/auth.store';

const login = (role = 'ROLE_ADMIN') => authStore.getState().login(
  `header.${btoa(JSON.stringify({ role, exp: 4_000_000_000 }))}.signature`, 'prueba@taller.invalid',
);

describe('ExportExcelButton — acceso protegido', () => {
  beforeEach(() => login());
  it('lleva al titular a la descarga en Cuenta sin iniciar una exportación', () => {
    render(<MemoryRouter><ExportExcelButton /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Exportar a Excel' })).toHaveAttribute('href', '/cuenta/exportacion#excel');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('no ofrece exportación al empleado', () => {
    login('ROLE_USER');
    render(<MemoryRouter><ExportExcelButton /></MemoryRouter>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
