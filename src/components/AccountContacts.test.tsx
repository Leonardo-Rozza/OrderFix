import { render as renderUi, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountContacts } from './AccountContacts';

const render = (content: ReactNode) => renderUi(<MemoryRouter>{content}</MemoryRouter>);

describe('AccountContacts', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PRIVACY_EMAIL', '');
    vi.stubEnv('VITE_LEGAL_EMAIL', '');
    vi.stubEnv('VITE_SUPPORT_EMAIL', '');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('explicita los contactos faltantes y no inventa un canal ni una solicitud', () => {
    render(<AccountContacts isAdmin tallerTelefono={null} />);

    expect(screen.getAllByText('Contacto todavía no disponible.')).toHaveLength(3);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/Las solicitudes sobre tus datos personales todavía no se gestionan/)).toBeVisible();
    expect(screen.getByText(/El cierre del taller todavía no está disponible/)).toBeVisible();
  });

  it('valida cada contacto aunque no sea una compilación de lanzamiento público', () => {
    vi.stubEnv('VITE_PRIVACY_EMAIL', ' privacidad@ordenfix.com ');
    vi.stubEnv('VITE_LEGAL_EMAIL', 'legal@example.com');
    vi.stubEnv('VITE_SUPPORT_EMAIL', 'javascript:alert(1)');
    render(<AccountContacts isAdmin tallerTelefono={null} />);

    expect(screen.getByRole('link', { name: 'Escribir a privacidad y datos: privacidad@ordenfix.com' }))
      .toHaveAttribute('href', 'mailto:privacidad%40ordenfix.com');
    expect(screen.getAllByText('Contacto todavía no disponible.')).toHaveLength(2);
    expect(screen.queryByText('legal@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('javascript:alert(1)')).not.toBeInTheDocument();
    expect(screen.getByText(/No envían mensajes ni registran solicitudes automáticamente/)).toBeVisible();
  });

  it('codifica delimitadores válidos del destinatario para no introducir cabeceras de correo', () => {
    vi.stubEnv('VITE_PRIVACY_EMAIL', 'datos?bcc=otro#%&@ordenfix.com');
    render(<AccountContacts isAdmin={false} tallerTelefono={null} />);

    const link = screen.getByRole('link', { name: /Escribir a privacidad y datos/ });
    expect(link).toHaveAttribute('href', 'mailto:datos%3Fbcc%3Dotro%23%25%26%40ordenfix.com');
    expect(link.getAttribute('href')).not.toMatch(/[?#&]/);
    expect(screen.getByText(/contactá al titular del taller o al contacto de privacidad/)).toBeVisible();
  });

  it.each([
    'privacidad@ordenfix.com\r\nBcc:otro@dominio.com',
    'privacidad@localhost',
    'privacidad@127.0.0.1',
    'privacidad@ordenfix.invalid',
    '<script>@ordenfix.com',
  ])('no enlaza un destinatario inválido: %s', (email) => {
    vi.stubEnv('VITE_PRIVACY_EMAIL', email);
    render(<AccountContacts isAdmin={false} tallerTelefono={null} />);

    expect(screen.getByRole('link', { name: 'Dar de baja mi acceso' })).toHaveAttribute('href', '/cuenta/baja-acceso');
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.getAllByText('Contacto todavía no disponible.')).toHaveLength(3);
    expect(screen.getByText(/Para otras consultas, contactá al titular del taller/)).toBeVisible();
  });

  it('orienta al empleado por su acceso personal y conserva el teléfono como texto', () => {
    render(<AccountContacts isAdmin={false} tallerTelefono="+54 11 4567-8900" />);

    expect(screen.getByText(/Podés dar de baja tu propio acceso/)).toBeVisible();
    expect(screen.getByText('Teléfono del taller: +54 11 4567-8900')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dar de baja mi acceso' })).toHaveAttribute('href', '/cuenta/baja-acceso');
    expect(screen.queryByRole('button', { name: /cerrar|exportar|enviar/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/El cierre del taller y la exportación integral/)).not.toBeInTheDocument();
  });
});
