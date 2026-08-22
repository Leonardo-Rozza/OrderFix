import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormActions, Modal } from './Modal';

describe('Modal', () => {
  it('separa cuerpo desplazable y footer, y restaura el foco al cerrar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Abrir</button>
        <Modal
          isOpen={false}
          onClose={onClose}
          title="Nueva orden"
          footer={(
            <FormActions>
              <button type="submit">Guardar</button>
            </FormActions>
          )}
        >
          <input aria-label="Detalle" />
        </Modal>
      </>,
    );

    const opener = screen.getByRole('button', { name: 'Abrir' });
    await user.click(opener);
    rerender(
      <>
        <button type="button">Abrir</button>
        <Modal
          isOpen
          onClose={onClose}
          title="Nueva orden"
          footer={(
            <FormActions>
              <button type="submit">Guardar</button>
            </FormActions>
          )}
        >
          <input aria-label="Detalle" />
        </Modal>
      </>,
    );

    await waitFor(() => expect(screen.getByLabelText('Detalle')).toHaveFocus());
    const dialog = screen.getByRole('dialog');
    const body = screen.getByLabelText('Detalle').parentElement;
    const footer = screen.getByRole('button', { name: 'Guardar' }).closest('.ofx-modal-footer') as HTMLElement | null;
    expect(dialog).toContainElement(body);
    expect(footer).not.toBeNull();
    expect(body).not.toContainElement(footer);

    rerender(
      <>
        <button type="button">Abrir</button>
        <Modal isOpen={false} onClose={onClose} title="Nueva orden">
          <input aria-label="Detalle" />
        </Modal>
      </>,
    );
    expect(opener).toHaveFocus();
  });

  it('preventClose bloquea Escape, backdrop y botón de cierre', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Guardando" preventClose>
        <p>Contenido</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    const close = screen.getByRole('button', { name: 'Cerrar' });
    expect(close).toBeDisabled();
    fireEvent.click(close);

    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement?.firstElementChild;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cierra por Escape cuando no hay una operación crítica', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Orden">
        <p>Contenido</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
