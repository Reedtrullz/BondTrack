import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IlCalculator from '../il-calculator';

describe('IlCalculator', () => {
  it('states estimate assumptions before manual calculator inputs', () => {
    render(<IlCalculator />);

    const assumptions = screen.getByLabelText('IL estimate assumptions');
    expect(assumptions).toHaveTextContent('Manual estimate');
    expect(assumptions).toHaveTextContent('50/50 formula');
    expect(assumptions).toHaveTextContent('Excludes fees');
    expect(assumptions).toHaveTextContent('Not source-confirmed');

    const inputs = screen.getByLabelText('IL calculator inputs');
    expect(
      assumptions.compareDocumentPosition(inputs) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('withholds the estimate when deposit amounts are invalid', () => {
    render(<IlCalculator />);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'RUNE Deposited' }), {
      target: { value: '' },
    });

    const result = screen.getByLabelText('IL estimate result');
    expect(result).toHaveTextContent(
      'Enter valid prices and deposit amounts to estimate impermanent loss'
    );
    expect(result).not.toHaveTextContent('NaN');
  });

  it('frames positive impermanent loss as an estimated loss with decision guidance', () => {
    render(<IlCalculator />);

    const result = screen.getByLabelText('IL estimate result');
    expect(result).toHaveTextContent('Estimated IL');
    expect(result).toHaveTextContent('Estimated loss');
    expect(result).toHaveTextContent('Estimated, not source-confirmed');
    expect(result).toHaveTextContent('Review before withdrawing');
    expect(result).toHaveTextContent('LP source confidence');
    expect(result).not.toHaveTextContent('live LP confidence');
  });
});
