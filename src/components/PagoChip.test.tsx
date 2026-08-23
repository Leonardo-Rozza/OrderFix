import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PagoChip } from './PagoChip';

describe('PagoChip', () => {
  it('prioriza el excedente a revisar por encima de PAGADO', () => {
    render(
      <PagoChip
        estadoPago="PAGADO"
        saldo={0}
        excedente={88323}
        requiereRevision
      />,
    );

    expect(screen.getByText(/Excedente a revisar.*88\.323/)).toBeVisible();
    expect(screen.queryByText('Pagado')).not.toBeInTheDocument();
  });

  it('deriva la revisión de un excedente positivo aunque falte el booleano', () => {
    render(<PagoChip estadoPago="PAGADO" saldo={0} excedente={500} />);

    expect(screen.getByText(/Excedente a revisar.*500/)).toBeVisible();
  });

  it('nombra explícitamente el pendiente de cobro', () => {
    render(<PagoChip estadoPago="PARCIAL" saldo={12345} excedente={0} />);

    expect(screen.getByText(/Pendiente de cobro.*12\.345/)).toBeVisible();
  });

  it('muestra Pagado sólo cuando no existe revisión', () => {
    render(<PagoChip estadoPago="PAGADO" saldo={0} excedente={0} requiereRevision={false} />);

    expect(screen.getByText('Pagado')).toBeVisible();
  });

  it('no inventa un estado sin datos de pago visibles', () => {
    const { container } = render(<PagoChip estadoPago="SIN_COBRAR" saldo={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
