import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutiveTelemetryPanel } from './ExecutiveTelemetryPanel';
import { TelemetryViewToggle } from './TelemetryViewToggle';

describe('TelemetryViewToggle', () => {
  it('switches between SRE and executive views', () => {
    const onViewChange = vi.fn();
    render(<TelemetryViewToggle view="sre" onViewChange={onViewChange} />);

    fireEvent.click(screen.getByTestId('telemetry-view-executive'));
    expect(onViewChange).toHaveBeenCalledWith('executive');
  });
});

describe('ExecutiveTelemetryPanel', () => {
  it('shows plain-English continuity summary without entity refs', () => {
    render(
      <ExecutiveTelemetryPanel
        result={{
          heat: new Map(),
          heatHops: new Map(),
          integrityHeat: new Map(),
          impactedNodes: ['shop/payment'],
          integrityImpactedNodes: [],
          entryPointSlas: { 'shop/web': 92 },
          overallSla: 92,
          overallIntegrity: 100,
          spofs: ['shop/payment'],
          impactedDomains: ['shop'],
          integrityImpactedDomains: [],
          advice: [],
          propagationStoppedAt: [],
        }}
      />
    );

    expect(screen.getByTestId('executive-risk-level')).toHaveTextContent('High risk');
    expect(screen.getByTestId('executive-availability-headline')).toHaveTextContent('92%');
    expect(screen.getByTestId('executive-spof-summary')).toHaveTextContent(
      'structural single point'
    );
    expect(screen.getByTestId('executive-journey-deferred')).toBeInTheDocument();
    expect(screen.queryByText('shop/web')).not.toBeInTheDocument();
  });
});
