import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Recommendation } from '@archlens/core/recommendations';
import type { SimulationResult } from '@archlens/core/resilience';
import { DEFAULT_RESILIENCE_MONTE_CARLO } from '../../../../../application/store/states/resilienceState';
import { DEMO_GRADUATION } from '../../../../content/demoGraduation';
import { ResilienceSection } from './ResilienceSection';

const recommendation: Recommendation = {
  id: 'add-circuit-breaker:shop/web:shop/api',
  kind: 'add-circuit-breaker',
  source: 'chaoslens',
  targetEntityRef: 'shop/web',
  targetName: 'Web App',
  title: 'Add caller-side circuit breaker',
  detail: 'In Web App, add a circuit breaker on the outbound client to API.',
  priority: 95,
  evidence: {},
  actions: [],
};

const simulationResult: SimulationResult = {
  heat: new Map(),
  heatHops: new Map(),
  integrityHeat: new Map(),
  impactedNodes: ['shop/payment'],
  integrityImpactedNodes: [],
  entryPointSlas: { 'shop/web': 88 },
  overallSla: 88,
  overallIntegrity: 100,
  spofs: [],
  impactedDomains: ['shop'],
  integrityImpactedDomains: [],
  advice: [],
  propagationStoppedAt: [],
  faultNodeIds: ['shop/payment'],
};

function renderSection(overrides: Partial<ComponentProps<typeof ResilienceSection>> = {}) {
  return render(
    <ResilienceSection
      telemetryView="sre"
      schemaNodes={[]}
      selectedNodeId={null}
      selectedNodeLabel={null}
      chaosSpecMetadata={null}
      faults={[]}
      faultType="region-outage"
      severity={1}
      safeguards={{}}
      monteCarlo={DEFAULT_RESILIENCE_MONTE_CARLO}
      simulationResult={simulationResult}
      recommendations={[recommendation]}
      onTelemetryViewChange={vi.fn()}
      onSelectFault={vi.fn()}
      onRemoveFault={vi.fn()}
      onFaultTypeChange={vi.fn()}
      onSeverityChange={vi.fn()}
      onSafeguardChange={vi.fn()}
      onAddFaultToScenario={vi.fn()}
      onMonteCarloChange={vi.fn()}
      onBrowseChaosSpecs={vi.fn()}
      onLoadChaosSpec={vi.fn()}
      onExportChaosSpec={vi.fn()}
      onClearScenario={vi.fn()}
      {...overrides}
    />
  );
}

describe('ResilienceSection', () => {
  it('hides graduation until the demo recommendation view settles', () => {
    renderSection({ sampleMode: true, recommendations: [] });
    expect(screen.queryByTestId('demo-graduation')).not.toBeInTheDocument();
  });

  it('hides graduation on a non-sample workspace', () => {
    renderSection({ sampleMode: false });
    expect(screen.queryByTestId('demo-graduation')).not.toBeInTheDocument();
  });

  it('shows named next-step actions after demo Chaos then Advice', () => {
    const onScanRepo = vi.fn();
    renderSection({ sampleMode: true, onScanRepo });

    expect(screen.getByTestId('demo-graduation')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: DEMO_GRADUATION.scanBrowser }));
    expect(onScanRepo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: DEMO_GRADUATION.unlockCli })).toBeEnabled();
  });
});
