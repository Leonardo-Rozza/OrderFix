import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('no renderiza nada sin resultados', () => {
    const { container } = render(<Pagination meta={undefined} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    const { container: c2 } = render(
      <Pagination meta={{ size: 20, number: 0, totalElements: 0, totalPages: 0 }} onChange={vi.fn()} />
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('muestra el conteo y oculta controles con una sola página', () => {
    render(<Pagination meta={{ size: 20, number: 0, totalElements: 5, totalPages: 1 }} onChange={vi.fn()} />);
    expect(screen.getByText(/5 resultados/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Siguiente')).not.toBeInTheDocument();
  });

  it('navega y deshabilita en los extremos', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Pagination meta={{ size: 20, number: 0, totalElements: 50, totalPages: 3 }} onChange={onChange} />
    );
    expect(screen.getByLabelText('Anterior')).toBeDisabled();
    await user.click(screen.getByLabelText('Siguiente'));
    expect(onChange).toHaveBeenCalledWith(1);

    rerender(<Pagination meta={{ size: 20, number: 2, totalElements: 50, totalPages: 3 }} onChange={onChange} />);
    expect(screen.getByLabelText('Siguiente')).toBeDisabled();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });
});
