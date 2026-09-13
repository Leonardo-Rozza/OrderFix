import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AccountContacts } from './AccountContacts';

describe('vínculo de cierre en Cuenta', () => {
  it('el titular con flag ve la entrada y sus límites', () => {
    render(<MemoryRouter><AccountContacts isAdmin tallerTelefono={null} workshopClosureAvailable /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Cierre y restauración del taller' })).toHaveAttribute('href', '/cuenta/cierre');
    expect(screen.getByText(/no elimina de inmediato tus datos ni confirma la cancelación/)).toBeVisible();
  });
  it.each([[true, false], [false, true], [false, false]])('rol admin=%s flag=%s no obtiene cierre', (isAdmin, workshopClosureAvailable) => {
    render(<MemoryRouter><AccountContacts isAdmin={isAdmin} tallerTelefono={null} workshopClosureAvailable={workshopClosureAvailable} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Cierre y restauración del taller' })).not.toBeInTheDocument();
  });
});
