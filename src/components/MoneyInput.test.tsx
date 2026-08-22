import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MoneyInput } from './MoneyInput';

// Wrapper controlado para probar el formateo en vivo.
const Harness = ({ onValue }: { onValue?: (v: number | '') => void }) => {
  const [value, setValue] = useState<number | ''>('');
  return (
    <MoneyInput
      id="m"
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
};

describe('MoneyInput', () => {
  it('formatea con separador de miles mientras se escribe', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox');
    await user.type(input, '40000');
    expect(input).toHaveValue('40.000');
  });

  it('entrega el number crudo al form', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.type(screen.getByRole('textbox'), '12500');
    expect(onValue).toHaveBeenLastCalledWith(12500);
  });

  it('recorta a 8 dígitos (tope del DECIMAL del backend)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox');
    await user.type(input, '123456789'); // 9 dígitos
    expect(input).toHaveValue('12.345.678');
  });

  it('ignora letras y símbolos, solo toma los dígitos', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'abc12de34');
    expect(input).toHaveValue('1.234');
  });

  it('reenvía atributos ARIA y usa teclado numérico móvil', () => {
    render(
      <MoneyInput
        id="monto"
        value=""
        onChange={vi.fn()}
        hasError
        aria-describedby="monto-error"
        aria-required
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'monto-error');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('conserva el caret al editar en el medio del monto formateado', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, '12345');
    expect(input).toHaveValue('12.345');

    input.setSelectionRange(2, 2);
    await user.type(input, '9', { skipClick: true });
    expect(input).toHaveValue('129.345');
    expect(input.selectionStart).toBe(3);
  });
});
