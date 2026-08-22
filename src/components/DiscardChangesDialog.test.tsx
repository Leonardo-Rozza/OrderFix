import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DiscardChangesDialog } from './DiscardChangesDialog';

describe('DiscardChangesDialog', () => {
  it('prioriza la acción segura y expone el mensaje accesible', async () => {
    render(
      <DiscardChangesDialog
        isOpen
        onContinueEditing={vi.fn()}
        onDiscardChanges={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '¿Descartar los cambios?' });
    const description = screen.getByText('Los datos que modificaste todavía no se guardaron.');
    expect(dialog).toHaveAttribute('aria-describedby', description.parentElement?.id);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir editando' })).toHaveFocus());
  });

  it('trata Escape y backdrop como seguir editando', () => {
    const onContinueEditing = vi.fn();
    const onDiscardChanges = vi.fn();
    render(
      <DiscardChangesDialog
        isOpen
        onContinueEditing={onContinueEditing}
        onDiscardChanges={onDiscardChanges}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement?.firstElementChild;
    fireEvent.click(backdrop as Element);

    expect(onContinueEditing).toHaveBeenCalledTimes(2);
    expect(onDiscardChanges).not.toHaveBeenCalled();
  });

  it('ejecuta el descarte una sola vez y lo deshabilita mientras hay una operación', async () => {
    const user = userEvent.setup();
    const onDiscardChanges = vi.fn();
    const { rerender } = render(
      <DiscardChangesDialog
        isOpen
        isBusy
        onContinueEditing={vi.fn()}
        onDiscardChanges={onDiscardChanges}
      />,
    );

    const discard = screen.getByRole('button', { name: 'Descartar cambios' });
    expect(discard).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Esperá a que termine');

    rerender(
      <DiscardChangesDialog
        isOpen
        onContinueEditing={vi.fn()}
        onDiscardChanges={onDiscardChanges}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(onDiscardChanges).toHaveBeenCalledTimes(1);
  });

  it('admite el copy seguro del estado parcial de reparación', () => {
    render(
      <DiscardChangesDialog
        isOpen
        copy={{
          title: 'La orden ya fue creada',
          message: 'Sólo se perderán los detalles locales que todavía no guardaste.',
          discardLabel: 'Cerrar y completar después',
        }}
        onContinueEditing={vi.fn()}
        onDiscardChanges={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'La orden ya fue creada' })).toBeInTheDocument();
    expect(screen.getByText('Sólo se perderán los detalles locales que todavía no guardaste.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar y completar después' })).toBeInTheDocument();
  });
});
