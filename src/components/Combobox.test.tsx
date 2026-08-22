import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox } from './Combobox';
import { Modal } from './Modal';

const options = [
  { value: 1, label: 'Ana Pérez', sublabel: 'iPhone' },
  { value: 2, label: 'Bruno Díaz', sublabel: 'Samsung' },
];

describe('Combobox', () => {
  it('reenvía ARIA y permite buscar/seleccionar con teclado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Combobox
        id="cliente"
        value={undefined}
        onChange={onChange}
        options={options}
        aria-describedby="cliente-error"
        aria-invalid
        aria-required
      />,
    );

    const trigger = screen.getByRole('button', { name: /seleccioná/i });
    expect(trigger).toHaveAttribute('aria-describedby', 'cliente-error');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-required', 'true');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).not.toHaveAttribute('role');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).not.toHaveAttribute('role');
    const search = await screen.findByRole('combobox', { name: 'Buscar opciones' });
    expect(search).toHaveFocus();
    await user.type(search, 'bruno');
    expect(screen.queryByRole('option', { name: /Ana Pérez/i })).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(2, options[1]);
  });

  it('consume el primer Escape antes de permitir que cierre el modal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Equipo">
        <Combobox value={undefined} onChange={vi.fn()} options={options} />
      </Modal>,
    );

    const trigger = screen.getByRole('button', { name: /seleccioná/i });
    await user.click(trigger);
    const search = await screen.findByRole('combobox', { name: 'Buscar opciones' });
    expect(search.closest('[role="dialog"]')).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mantiene el portal dentro del modal cuando la capa queda suspendida', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Modal isOpen onClose={vi.fn()} title="Equipo">
        <Combobox value={undefined} onChange={vi.fn()} options={options} />
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: /seleccioná/i }));
    const listbox = await screen.findByRole('listbox');

    rerender(
      <Modal isOpen suspended onClose={vi.fn()} title="Equipo">
        <Combobox value={undefined} onChange={vi.fn()} options={options} />
      </Modal>,
    );

    const suspendedLayer = document.querySelector('[data-modal-suspended="true"]');
    expect(suspendedLayer).toContainElement(listbox);
    expect(listbox.closest('[data-modal-panel]')).not.toBeNull();
    expect(document.body.contains(listbox)).toBe(true);
  });

  it('abre hacia arriba y limita la altura cuando no hay espacio debajo', async () => {
    const user = userEvent.setup();
    render(<Combobox value={undefined} onChange={vi.fn()} options={options} />);

    const trigger = screen.getByRole('button', { name: /seleccioná/i });
    vi.spyOn(trigger.parentElement as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      bottom: 780,
      height: 44,
      left: 20,
      right: 220,
      top: 736,
      width: 200,
      x: 20,
      y: 736,
      toJSON: () => ({}),
    });
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    const popover = listbox.parentElement;
    await waitFor(() => expect(popover).toHaveAttribute('data-placement', 'up'));
    expect(Number.parseFloat(popover?.style.maxHeight ?? '')).toBeLessThanOrEqual(320);
    expect(popover?.style.transform).toBe('translateY(-100%)');
  });

  it('comunica una selección existente sin inventar una etiqueta', () => {
    render(<Combobox aria-label="Cliente" value={99} onChange={vi.fn()} options={[]} />);

    expect(screen.getByRole('button', { name: 'Cliente' })).toHaveTextContent('Selección actual sin datos');
  });

  it('mantiene Tab y Shift+Tab dentro del diálogo aunque la lista esté en un portal', async () => {
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={vi.fn()} title="Equipo">
        <input aria-label="Campo anterior" />
        <Combobox aria-label="Cliente" value={undefined} onChange={vi.fn()} options={options} />
        <input aria-label="Campo siguiente" />
      </Modal>,
    );

    const trigger = screen.getByRole('button', { name: 'Cliente' });
    await user.click(trigger);
    await screen.findByRole('combobox', { name: 'Buscar opciones' });
    await user.tab();
    expect(screen.getByLabelText('Campo siguiente')).toHaveFocus();

    await user.click(trigger);
    await screen.findByRole('combobox', { name: 'Buscar opciones' });
    await user.tab({ shift: true });
    expect(screen.getByLabelText('Campo anterior')).toHaveFocus();
  });

  it('permite salir con Tab mientras la página siguiente todavía está cargando', async () => {
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={vi.fn()} title="Equipo">
        <Combobox
          aria-label="Cliente"
          value={undefined}
          onChange={vi.fn()}
          options={options.slice(0, 1)}
          filterMode="remote"
          searchValue=""
          onSearchChange={vi.fn()}
          hasNextPage
          isFetchingNextPage
          onLoadMore={vi.fn()}
        />
        <input aria-label="Campo siguiente" />
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    const search = await screen.findByRole('combobox', { name: 'Buscar opciones' });
    expect(screen.getByRole('button', { name: 'Cargando más…' })).toBeDisabled();

    await user.tab();

    expect(screen.getByLabelText('Campo siguiente')).toHaveFocus();
    expect(search).not.toBeInTheDocument();
  });

  it('permite alcanzar Cargar más por teclado y también pedirlo con Flecha abajo', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    render(
      <Modal isOpen onClose={vi.fn()} title="Equipo">
        <Combobox
          aria-label="Cliente"
          value={undefined}
          onChange={vi.fn()}
          options={options.slice(0, 1)}
          filterMode="remote"
          searchValue=""
          onSearchChange={vi.fn()}
          hasNextPage
          onLoadMore={onLoadMore}
        />
        <input aria-label="Campo siguiente" />
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    const search = await screen.findByRole('combobox', { name: 'Buscar opciones' });
    await user.tab();
    const loadMore = screen.getByRole('button', { name: 'Cargar más' });
    expect(loadMore).toHaveFocus();
    await user.tab({ shift: true });
    expect(search).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
