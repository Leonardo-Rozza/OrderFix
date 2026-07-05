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
});
