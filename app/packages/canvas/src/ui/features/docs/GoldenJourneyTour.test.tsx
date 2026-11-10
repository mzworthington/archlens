import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoldenJourneyTour } from './GoldenJourneyTour';

describe('GoldenJourneyTour', () => {
  it('renders estate product map and six journey steps with deep links', () => {
    render(<GoldenJourneyTour />);

    expect(screen.getByTestId('golden-journey-tour')).toBeInTheDocument();
    expect(screen.getByTestId('golden-journey-estate-map')).toBeInTheDocument();
    expect(screen.getByText('Catalog Platform')).toBeInTheDocument();
    expect(screen.getByText('Checkout Platform')).toBeInTheDocument();

    for (let step = 1; step <= 6; step += 1) {
      expect(screen.getByTestId(`journey-step-${step}`)).toBeInTheDocument();
    }

    expect(screen.getByTestId('journey-step-2-cta')).toHaveAttribute(
      'href',
      '/workspace/samples/golden-journey'
    );
    expect(screen.getByTestId('journey-step-3-cta')).toHaveAttribute(
      'href',
      '/workspace/samples/golden-journey?lens=chaoslens'
    );
    expect(screen.getByTestId('journey-step-5-cta')).toHaveAttribute(
      'href',
      '/workspace/samples/golden-journey?lens=advicelens&plan=samples%2Fgolden-journey%2Fcheckout-platform%2Fcheckout-api'
    );
  });

  it('renders the product chip in accent ink so the label stays readable on a light page', () => {
    render(<GoldenJourneyTour />);

    const chip = screen.getByText('ArchLens CLI');
    expect(chip).toHaveClass('text-accent', 'bg-accent/10', 'text-xs');
    expect(chip.className).not.toContain('text-slate-400');
    expect(chip.className).not.toContain('bg-slate-800');
  });
});
