import { createRef, useState, type ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateInput } from './DateInput';

type ControlledProps = Omit<ComponentProps<typeof DateInput>, 'value' | 'onChange'> & {
  initialValue?: string;
  onChange?: (value: string) => void;
};

function ControlledDate({ initialValue = '', onChange, ...props }: ControlledProps) {
  const [value, setValue] = useState(initialValue);
  return (
    <DateInput
      {...props}
      value={value}
      onChange={(next) => { setValue(next); onChange?.(next); }}
    />
  );
}

async function openCalendar(user: ReturnType<typeof userEvent.setup>, label = 'Fecha') {
  await user.click(screen.getByRole('button', { name: `Abrir calendario: ${label}` }));
  const calendar = await screen.findByRole('dialog', { name: `Calendario: ${label}` });
  // La primera apertura transforma el módulo diferido; el timeout del test no
  // amplía por sí solo el segundo de espera predeterminado de Testing Library.
  await within(calendar).findByRole('button', { name: 'Limpiar fecha' }, { timeout: 5_000 });
  return calendar;
}

describe('DateInput', () => {
  it('muestra fechas ISO en formato local y conserva los borradores recibidos', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DateInput label="Fecha" aria-label="Fecha" value="2024-02-29" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Fecha' });

    expect(input).toHaveValue('29/02/2024');
    rerender(<DateInput label="Fecha" aria-label="Fecha" value="31/02/2024" onChange={onChange} />);
    expect(input).toHaveValue('31/02/2024');
    rerender(<DateInput label="Fecha" aria-label="Fecha" value="12/0" onChange={onChange} />);
    expect(input).toHaveValue('12/0');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emite borradores mientras se escribe y una fecha ISO al completar una fecha válida', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDate label="Fecha" aria-label="Fecha" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Fecha' });

    await user.type(input, '29/02/');
    expect(onChange).toHaveBeenLastCalledWith('29/02/');
    expect(input).toHaveValue('29/02/');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.type(input, '2024');
    expect(onChange).toHaveBeenLastCalledWith('2024-02-29');
    expect(input).toHaveValue('29/02/2024');
  });

  it('acepta el teclado numérico e inserta separadores sin impedir borrar un borrador', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDate label="Fecha" aria-label="Fecha" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Fecha' });

    await user.type(input, '29022024');
    expect(input).toHaveValue('29/02/2024');
    expect(onChange).toHaveBeenLastCalledWith('2024-02-29');

    await user.keyboard('{Backspace>5/}');
    expect(input).toHaveValue('29/02');
    expect(onChange).toHaveBeenLastCalledWith('29/02');
    await user.keyboard('{Backspace>3/}');
    expect(input).toHaveValue('29');
    expect(onChange).toHaveBeenLastCalledWith('29');
    await user.keyboard('{Backspace>2/}');
    expect(input).toHaveValue('');
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('valida al perder foco sin descartar una fecha imposible y limpia el error al corregirla', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    const onChange = vi.fn();
    render(<ControlledDate label="Fecha" aria-label="Fecha" onBlur={onBlur} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Fecha' });

    await user.type(input, '31/02/2024');
    expect(onChange).toHaveBeenLastCalledWith('31/02/2024');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.tab();

    expect(onBlur).toHaveBeenCalledOnce();
    expect(input).toHaveValue('31/02/2024');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá una fecha válida en dd/mm/aaaa.');

    await user.clear(input);
    await user.type(input, '29/02/2024');
    expect(onChange).toHaveBeenLastCalledWith('2024-02-29');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['2024-02-28', 'Ingresá una fecha igual o posterior al 29/02/2024.'],
    ['2024-03-02', 'Ingresá una fecha igual o anterior al 01/03/2024.'],
  ])('explica el límite incumplido para %s y conserva la ayuda externa', (value, message) => {
    render(
      <>
        <DateInput id="fecha" label="Fecha" aria-label="Fecha" aria-describedby="ayuda" value={value} min="2024-02-29" max="2024-03-01" onChange={vi.fn()} />
        <p id="ayuda">Fecha de entrega estimada</p>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Fecha' });
    fireEvent.blur(input);

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(input).toHaveAttribute('aria-describedby', 'ayuda fecha-date-error');
    expect(input).toHaveAccessibleDescription(`Fecha de entrega estimada ${message}`);
  });

  it.each(['2024-02-29', '2024-03-01', ''])('admite los extremos inclusivos y el campo opcional vacío: %s', (value) => {
    render(<DateInput label="Fecha" aria-label="Fecha" value={value} min="2024-02-29" max="2024-03-01" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Fecha' });
    fireEvent.blur(input);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('evita duplicar el error del formulario y conserva su asociación accesible', () => {
    render(
      <>
        <DateInput label="Fecha" aria-label="Fecha" aria-describedby="error-externo" value="31/02/2024" hasError onChange={vi.fn()} />
        <p id="error-externo" role="alert">Revisá la fecha de entrega.</p>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Fecha' });
    fireEvent.blur(input);

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Revisá la fecha de entrega.');
  });

  it('reenvía el ref y atributos del formulario al input', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <>
        <label htmlFor="fecha-entrega">Entrega</label>
        <DateInput ref={ref} id="fecha-entrega" name="fechaEntrega" label="Entrega" required value="2024-02-29" onChange={vi.fn()} />
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Entrega' });

    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('name', 'fechaEntrega');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toBeRequired();
  });

  it.each(['disabled', 'readOnly'] as const)('impide editar y abrir el calendario cuando %s está activo', async (attribute) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateInput label="Fecha" aria-label="Fecha" value="2024-02-29" onChange={onChange} {...{ [attribute]: true }} />);
    const input = screen.getByRole('textbox', { name: 'Fecha' });
    const trigger = screen.getByRole('button', { name: 'Abrir calendario: Fecha' });

    await user.type(input, '15');
    await user.click(trigger);
    fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true });

    expect(trigger).toBeDisabled();
    expect(input).toHaveValue('29/02/2024');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // La primera apertura importa el calendario real; tolera la transformación en frío de un worker ocupado.
  it.each(['disabled', 'readOnly'] as const)('cierra el calendario si %s cambia mientras está abierto', async (attribute) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const props = { label: 'Fecha', 'aria-label': 'Fecha', value: '2024-02-29', onChange };
    const { rerender } = render(<DateInput {...props} />);
    await openCalendar(user);
    rerender(<DateInput {...props} {...{ [attribute]: true }} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir calendario: Fecha' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  }, 10_000);

  it('abre con Alt+Flecha abajo y cierra con Escape devolviendo el foco al botón', async () => {
    const user = userEvent.setup();
    render(<ControlledDate label="Entrega" aria-label="Entrega" initialValue="2024-02-28" />);
    const input = screen.getByRole('textbox', { name: 'Entrega' });
    const trigger = screen.getByRole('button', { name: 'Abrir calendario: Entrega' });
    await user.click(input);
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    const calendar = await screen.findByRole('dialog', { name: 'Calendario: Entrega' });
    const selected = await within(calendar).findByRole('button', { name: /28 de febrero de 2024, seleccionado/ });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', calendar.id);
    await waitFor(() => expect(selected).toHaveFocus());
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(input).toHaveValue('28/02/2024');
  });

  it('permite elegir un día por teclado, emite ISO y devuelve el foco sin enviar el formulario', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ControlledDate label="Fecha" aria-label="Fecha" initialValue="2024-02-28" onChange={onChange} />
      </form>,
    );
    const calendar = await openCalendar(user);
    const selected = await within(calendar).findByRole('button', { name: /28 de febrero de 2024, seleccionado/ });
    await waitFor(() => expect(selected).toHaveFocus());
    await user.keyboard('{ArrowRight}');
    expect(within(calendar).getByRole('button', { name: /29 de febrero de 2024/ })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenLastCalledWith('2024-02-29');
    expect(screen.getByRole('textbox', { name: 'Fecha' })).toHaveValue('29/02/2024');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir calendario: Fecha' })).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('deshabilita días fuera del rango y permite seleccionar sus extremos', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDate label="Fecha" aria-label="Fecha" initialValue="2024-02-27" min="2024-02-27" max="2024-02-28" onChange={onChange} />);
    const calendar = await openCalendar(user);

    expect(within(calendar).getByRole('button', { name: /26 de febrero de 2024/ })).toBeDisabled();
    expect(within(calendar).getByRole('button', { name: /27 de febrero de 2024/ })).toBeEnabled();
    expect(within(calendar).getByRole('button', { name: /28 de febrero de 2024/ })).toBeEnabled();
    expect(within(calendar).getByRole('button', { name: /29 de febrero de 2024/ })).toBeDisabled();
    await user.click(within(calendar).getByRole('button', { name: /28 de febrero de 2024/ }));

    expect(onChange).toHaveBeenLastCalledWith('2024-02-28');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('limpia un borrador inválido desde el calendario y elimina su error', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDate label="Fecha" aria-label="Fecha" initialValue="31/02/2024" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Fecha' });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    const calendar = await openCalendar(user);
    await user.click(within(calendar).getByRole('button', { name: 'Limpiar fecha' }));

    expect(onChange).toHaveBeenLastCalledWith('');
    expect(input).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir calendario: Fecha' })).toHaveFocus();
  });

  it('respeta la cancelación del atajo por el formulario consumidor', () => {
    render(<DateInput label="Fecha" aria-label="Fecha" value="" onChange={vi.fn()} onKeyDown={(event) => event.preventDefault()} />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Fecha' }), { key: 'ArrowDown', altKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
