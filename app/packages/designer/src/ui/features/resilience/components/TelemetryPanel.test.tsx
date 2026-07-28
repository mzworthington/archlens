import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelemetryPanel } from './TelemetryPanel';

describe('TelemetryPanel', () => {
  it('explains when SLA is unchanged but integrity degraded', () => {
    render(
      <TelemetryPanel
        result={{
          heat: new Map(),
          heatHops: new Map(),
          integrityHeat: new Map([['shop/worker', 0.5]]),
          impactedNodes: [],
          integrityImpactedNodes: ['shop/worker'],
          entryPointSlas: { 'shop/web': 100 },
          overallSla: 100,
          overallIntegrity: 75,
          spofs: [],
          impactedDomains: [],
          integrityImpactedDomains: ['shop'],
          advice: [],
          propagationStoppedAt: [],
        }}
      />
    );

    expect(screen.getByTestId('telemetry-no-sla-impact')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-integrity-only')).toBeInTheDocument();
  });
});
