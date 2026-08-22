import { createRef } from 'react';
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
    await waitFor(() => expect(opener).toHaveFocus());
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

  it('informa el botón de cierre como invocador aunque el navegador no lo enfoque al hacer click', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Orden">
        <p>Contenido</p>
      </Modal>,
    );

    const close = screen.getByRole('button', { name: 'Cerrar' });
    fireEvent.click(close);

    expect(onClose).toHaveBeenCalledWith(close);
  });

  it('suspende el diálogo inferior y deja activa sólo la capa superior', () => {
    const onCloseBase = vi.fn();
    const onCloseGuard = vi.fn();
    render(
      <>
        <Modal isOpen suspended onClose={onCloseBase} title="Editar orden">
          <input aria-label="Detalle" />
        </Modal>
        <Modal isOpen layer="guard" onClose={onCloseGuard} title="Descartar">
          <button type="button">Continuar</button>
        </Modal>
      </>,
    );

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog').closest('[data-modal-layer]')).toHaveAttribute('data-modal-layer', 'guard');

    const suspended = document.querySelector('[data-modal-suspended="true"]');
    expect(suspended).toHaveAttribute('inert');
    expect(suspended).toHaveAttribute('aria-hidden', 'true');
    expect(suspended?.querySelector('[role="dialog"]')).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseGuard).toHaveBeenCalledTimes(1);
    expect(onCloseBase).not.toHaveBeenCalled();

    const suspendedBackdrop = suspended?.firstElementChild;
    fireEvent.click(suspendedBackdrop as Element);
    expect(onCloseBase).not.toHaveBeenCalled();
  });

  it('hace que la capa global sea la única accesible y reactiva la guardia al cerrar', async () => {
    document.body.style.overflow = 'auto';
    document.body.style.overscrollBehavior = 'contain';
    const guardActionRef = createRef<HTMLButtonElement>();
    const safeGlobalActionRef = createRef<HTMLButtonElement>();
    const onCloseBase = vi.fn();
    const onCloseGuard = vi.fn();
    const onCloseGlobal = vi.fn();
    const stack = (globalOpen: boolean, lowerLayersOpen = true) => (
      <>
        <Modal isOpen={lowerLayersOpen} onClose={onCloseBase} title="Editar orden">
          <button type="button">Guardar orden</button>
        </Modal>
        <Modal isOpen={lowerLayersOpen} layer="guard" onClose={onCloseGuard} title="Descartar cambios">
          <button ref={guardActionRef} type="button">Seguir editando</button>
          <button type="button">Descartar</button>
        </Modal>
        <Modal
          isOpen={globalOpen}
          layer="global"
          onClose={onCloseGlobal}
          title="Límite del plan"
          initialFocusRef={safeGlobalActionRef}
        >
          <button ref={safeGlobalActionRef} type="button">Ahora no</button>
          <button type="button">Acción final</button>
        </Modal>
      </>
    );
    const { container, rerender } = render(stack(false));

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Descartar cambios' })).toBeVisible());
    guardActionRef.current?.focus();
    rerender(stack(true));

    const globalDialog = await screen.findByRole('dialog', { name: 'Límite del plan' });
    await waitFor(() => expect(safeGlobalActionRef.current).toHaveFocus());
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(container).toHaveAttribute('aria-hidden', 'true');
    expect(container).toHaveAttribute('inert');
    expect(document.querySelector('[data-modal-layer="base"]')).toHaveAttribute('inert');
    expect(document.querySelector('[data-modal-layer="guard"]')).toHaveAttribute('inert');
    expect(globalDialog.closest('[data-modal-layer]')).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');

    const finalAction = screen.getByRole('button', { name: 'Acción final' });
    finalAction.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(globalDialog.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseGlobal).toHaveBeenCalledTimes(1);
    expect(onCloseGuard).not.toHaveBeenCalled();
    expect(onCloseBase).not.toHaveBeenCalled();
    rerender(stack(false));

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Descartar cambios' })).toBeVisible());
    await waitFor(() => expect(guardActionRef.current).toHaveFocus());
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(container).not.toHaveAttribute('aria-hidden');
    expect(container).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');

    rerender(stack(true));
    const reopenedGlobal = await screen.findByRole('dialog', { name: 'Límite del plan' });
    await waitFor(() => expect(safeGlobalActionRef.current).toHaveFocus());
    const globalBackdrop = reopenedGlobal.parentElement?.firstElementChild;
    fireEvent.click(globalBackdrop as Element);
    expect(onCloseGlobal).toHaveBeenCalledTimes(2);
    expect(onCloseGuard).not.toHaveBeenCalled();

    rerender(stack(false, false));
    await waitFor(() => expect(document.body.style.overflow).toBe('auto'));
    expect(document.body.style.overscrollBehavior).toBe('contain');
  });

  it('restaura el foco al invocador capturado aunque el diálogo inferior pierda el foco al suspenderse', async () => {
    const invokerRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <>
        <Modal isOpen onClose={vi.fn()} title="Editar orden">
          <button ref={invokerRef} type="button">Cancelar</button>
        </Modal>
        <Modal isOpen={false} layer="guard" onClose={vi.fn()} title="Descartar">
          <button type="button">Seguir editando</button>
        </Modal>
      </>,
    );

    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    cancel.focus();
    cancel.blur();

    rerender(
      <>
        <Modal isOpen suspended onClose={vi.fn()} title="Editar orden">
          <button ref={invokerRef} type="button">Cancelar</button>
        </Modal>
        <Modal
          isOpen
          layer="guard"
          onClose={vi.fn()}
          title="Descartar"
          restoreFocusRef={invokerRef}
        >
          <button type="button">Seguir editando</button>
        </Modal>
      </>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir editando' })).toHaveFocus());

    rerender(
      <>
        <Modal isOpen onClose={vi.fn()} title="Editar orden">
          <button ref={invokerRef} type="button">Cancelar</button>
        </Modal>
        <Modal
          isOpen={false}
          layer="guard"
          onClose={vi.fn()}
          title="Descartar"
          restoreFocusRef={invokerRef}
        >
          <button type="button">Seguir editando</button>
        </Modal>
      </>,
    );

    expect(document.querySelector('[data-modal-suspended="true"]')).toBeNull();
    await waitFor(() => expect(cancel).toHaveFocus());
  });

  it('omite la restauración cuando el cierre continúa con un descarte o navegación', async () => {
    const invokerRef = createRef<HTMLButtonElement>();
    const restoreFocusOnCloseRef = { current: true };
    const { rerender } = render(
      <>
        <button ref={invokerRef} type="button">Abrir</button>
        <Modal
          isOpen={false}
          onClose={vi.fn()}
          title="Descartar"
          restoreFocusRef={invokerRef}
          restoreFocusOnCloseRef={restoreFocusOnCloseRef}
        >
          <button type="button">Seguir editando</button>
        </Modal>
      </>,
    );

    const invoker = screen.getByRole('button', { name: 'Abrir' });
    invoker.focus();
    rerender(
      <>
        <button ref={invokerRef} type="button">Abrir</button>
        <Modal
          isOpen
          onClose={vi.fn()}
          title="Descartar"
          restoreFocusRef={invokerRef}
          restoreFocusOnCloseRef={restoreFocusOnCloseRef}
        >
          <button type="button">Seguir editando</button>
        </Modal>
      </>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir editando' })).toHaveFocus());

    const focusSpy = vi.spyOn(invoker, 'focus');
    restoreFocusOnCloseRef.current = false;
    rerender(
      <>
        <button ref={invokerRef} type="button">Abrir</button>
        <Modal
          isOpen={false}
          onClose={vi.fn()}
          title="Descartar"
          restoreFocusRef={invokerRef}
          restoreFocusOnCloseRef={restoreFocusOnCloseRef}
        >
          <button type="button">Seguir editando</button>
        </Modal>
      </>,
    );
    await Promise.resolve();

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('respeta el foco inicial explícito', async () => {
    const safeActionRef = createRef<HTMLButtonElement>();
    render(
      <Modal
        isOpen
        onClose={vi.fn()}
        title="Confirmar"
        initialFocusRef={safeActionRef}
      >
        <button type="button">Primera acción</button>
        <button ref={safeActionRef} type="button">Acción segura</button>
      </Modal>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Acción segura' })).toHaveFocus());
  });

  it('recupera el foco si Tab llega desde fuera de la capa activa', () => {
    render(
      <>
        <button type="button">Fuera</button>
        <Modal isOpen onClose={vi.fn()} title="Confirmar">
          <button type="button">Primera</button>
          <button type="button">Última</button>
        </Modal>
      </>,
    );

    screen.getByRole('button', { name: 'Fuera' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();

    screen.getByRole('button', { name: 'Fuera' }).focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Última' })).toHaveFocus();
  });

  it('mantiene el scroll bloqueado hasta cerrar la última capa', () => {
    document.body.style.overflow = 'auto';
    document.body.style.overscrollBehavior = 'contain';
    const { rerender } = render(
      <>
        <Modal isOpen onClose={vi.fn()} title="Base"><p>Base</p></Modal>
        <Modal isOpen layer="guard" onClose={vi.fn()} title="Guard"><p>Guard</p></Modal>
      </>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.overscrollBehavior).toBe('none');

    rerender(
      <>
        <Modal isOpen={false} onClose={vi.fn()} title="Base"><p>Base</p></Modal>
        <Modal isOpen layer="guard" onClose={vi.fn()} title="Guard"><p>Guard</p></Modal>
      </>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <>
        <Modal isOpen={false} onClose={vi.fn()} title="Base"><p>Base</p></Modal>
        <Modal isOpen={false} layer="guard" onClose={vi.fn()} title="Guard"><p>Guard</p></Modal>
      </>,
    );
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.overscrollBehavior).toBe('contain');
  });
});
