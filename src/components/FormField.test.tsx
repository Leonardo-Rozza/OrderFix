import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('compone descripción, error y requerido sin perder atributos existentes', () => {
    render(
      <>
        <p id="hint">Usá el valor de la orden</p>
        <FormField label="Monto" htmlFor="monto" error="Monto inválido" required errorId="monto-error">
          <input id="monto" aria-describedby="hint" aria-invalid="spelling" />
        </FormField>
      </>,
    );

    const input = screen.getByLabelText(/monto/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'hint monto-error');
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'monto-error');
  });

  it('expone el errorId y atributos ARIA a controles compuestos', () => {
    render(
      <FormField label="Cliente" error="Elegí un cliente" errorId="cliente-error">
        {({ errorId, ...aria }) => (
          <button type="button" data-error-id={errorId} {...aria}>
            Seleccionar cliente
          </button>
        )}
      </FormField>,
    );

    const control = screen.getByRole('button', { name: 'Seleccionar cliente' });
    expect(control).toHaveAttribute('data-error-id', 'cliente-error');
    expect(control).toHaveAttribute('aria-describedby', 'cliente-error');
    expect(control).toHaveAttribute('aria-invalid', 'true');
  });
});
