import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('alterna la visibilidad sin perder valor ni atributos nativos', async () => {
    const user = userEvent.setup();
    render(
      <PasswordInput
        id="clave"
        name="password"
        autoComplete="current-password"
        defaultValue="secreto1"
        aria-describedby="clave-ayuda"
      />,
    );

    const input = screen.getByDisplayValue('secreto1');
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });

    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('name', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toHaveAttribute('aria-describedby', 'clave-ayuda');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('secreto1');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('secreto1');
  });

  it('reenvía el ref y deshabilita también el toggle', () => {
    const ref = createRef<HTMLInputElement>();
    render(<PasswordInput ref={ref} aria-label="Clave temporal" disabled />);

    expect(ref.current).toBe(screen.getByLabelText('Clave temporal'));
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeDisabled();
  });
});
