import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute, PublicRoute } from './guards';
import { authStore } from '../store/auth.store';

// JWT de mentira con el exp dado (segundos).
const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const makeToken = (expSec: number) => `${b64url({ alg: 'HS256' })}.${b64url({ sub: 'a@a.com', exp: expSec })}.firma`;
const tokenVigente = () => makeToken(Math.floor(Date.now() / 1000) + 3600);
const tokenVencido = () => makeToken(Math.floor(Date.now() / 1000) - 60);

const renderProtegida = () =>
  render(
    <MemoryRouter initialEntries={['/priv']}>
      <Routes>
        <Route path="/priv" element={<ProtectedRoute><div>PRIVADO</div></ProtectedRoute>} />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  authStore.getState().logout();
});

describe('ProtectedRoute', () => {
  it('redirige a /login sin sesión', () => {
    renderProtegida();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('deja pasar con token vigente', () => {
    authStore.getState().login(tokenVigente(), 'a@a.com');
    renderProtegida();
    expect(screen.getByText('PRIVADO')).toBeInTheDocument();
  });

  it('redirige a /login con token vencido', () => {
    authStore.getState().login(tokenVencido(), 'a@a.com');
    renderProtegida();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  it('redirige al dashboard si hay sesión válida', () => {
    authStore.getState().login(tokenVigente(), 'a@a.com');
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoute><div>FORM LOGIN</div></PublicRoute>} />
          <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
  });

  it('muestra el login si no hay sesión', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoute><div>FORM LOGIN</div></PublicRoute>} />
          <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('FORM LOGIN')).toBeInTheDocument();
  });
});
