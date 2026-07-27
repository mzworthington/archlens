import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonteCarloControls } from './MonteCarloControls';
import { DEFAULT_RESILIENCE_MONTE_CARLO } from '../../../../application/store/states/resilienceState';

describe('MonteCarloControls', () => {
  it('renders current config and reports changes', () => {
    const onChange = vi.fn();

    render(<MonteCarloControls config={DEFAULT_RESILIENCE_MONTE_CARLO} onChange={onChange} />);

    expect(screen.getByTestId('monte-carlo-iterations')).toHaveValue('1000');
    expect(screen.getByTestId('monte-carlo-seed')).toHaveValue(42);

    fireEvent.change(screen.getByTestId('monte-carlo-iterations'), { target: { value: '2000' } });
    fireEvent.change(screen.getByTestId('monte-carlo-seed'), { target: { value: '7' } });
    fireEvent.change(screen.getByTestId('monte-carlo-jitter'), { target: { value: '20' } });

    expect(onChange).toHaveBeenCalledWith({ iterations: 2000 });
    expect(onChange).toHaveBeenCalledWith({ seed: 7 });
    expect(onChange).toHaveBeenCalledWith({ severityJitter: 0.2 });
  });
});
