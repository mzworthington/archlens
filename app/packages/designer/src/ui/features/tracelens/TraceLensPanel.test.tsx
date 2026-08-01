import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { TraceLensPanel } from './TraceLensPanel';
import { useBlueprintStore } from '../../../application/store/store';

describe('TraceLensPanel', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isTraceLensMode: true,
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [{ from: 'app/designer/db', to: 'app/designer/ok', type: 'direct-call' }],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.85,
                  complexity: 40,
                  churn: 6,
                  authorCount: 2,
                  classifications: ['hotspot'],
                  sinceDays: 90,
                },
              },
              {
                entityRef: 'app/designer/ok',
                name: 'OK',
                type: 'component',
                forensics: {
                  hotspotScore: 0.05,
                  complexity: 2,
                  classifications: [],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('renders ranked offenders and filters to hotspots', () => {
    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getByRole('heading', { name: 'Worst offenders' })).toBeInTheDocument();
    expect(screen.getAllByText(/DB Layer/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\bOK\b/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/deps 1/).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /^Hotspots$/i }));
    expect(screen.getAllByText(/DB Layer/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('simulate-failure-app/designer/ok')).not.toBeInTheDocument();
  });

  it('shows guidance when no blueprints are in scope', () => {
    useBlueprintStore.setState({
      loadedSystems: [],
      workspaceCatalog: [],
      isWorkspaceOpen: false,
      workspaceName: '',
    });

    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getByText(/startup chooser/i)).toBeInTheDocument();
  });

  it('renders offenders for an open folder workspace', () => {
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'my-blueprints',
      workspaceCatalog: [
        {
          path: 'context.yaml',
          name: 'Context',
          level: 'context',
          entityRef: 'my-blueprints',
          nodeEntityRefs: [],
        },
      ],
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.85,
                  classifications: ['hotspot'],
                },
              },
            ],
          },
        },
      ],
    });

    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getAllByText(/DB Layer/).length).toBeGreaterThan(0);
  });

  it('filters refactor candidates by heuristic score', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.2,
                  complexity: 20,
                  churn: 10,
                  topAuthorPercent: 0.5,
                  classifications: [],
                  sinceDays: 90,
                },
              },
              {
                entityRef: 'app/designer/ok',
                name: 'OK',
                type: 'component',
                forensics: {
                  hotspotScore: 0.9,
                  complexity: 2,
                  churn: 0,
                  classifications: ['hotspot'],
                },
              },
            ],
          },
        },
      ],
    });

    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Refactor$/i }));
    expect(screen.getAllByText(/DB Layer/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('simulate-failure-app/designer/ok')).not.toBeInTheDocument();
    expect(screen.getByTestId('offender-list')).toBeInTheDocument();
  });

  it('filters the ranking list from the page search', () => {
    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    fireEvent.change(screen.getByRole('textbox', { name: /Search offenders/i }), {
      target: { value: 'DB Layer' },
    });
    expect(screen.getByText(/DB Layer ·/)).toBeInTheDocument();
    expect(screen.queryByTestId('simulate-failure-app/designer/ok')).not.toBeInTheDocument();
  });

  it('opens refactor plan slide-over when an offender row is clicked', async () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            source: {
              remoteUrl: 'https://github.com/backstage/backstage',
              defaultBranch: 'master',
              scannedAtCommit: 'abc123',
              scanRoot: '.',
            },
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                properties: { filepath: 'src/db.ts' },
                forensics: {
                  hotspotScore: 0.85,
                  complexity: 40,
                  churn: 6,
                  authorCount: 2,
                  topAuthorPercent: 0.5,
                  authors: [
                    { email: 'alice@ex.com', commits: 3 },
                    { email: 'bob@ex.com', commits: 3 },
                  ],
                  classifications: ['hotspot'],
                  sinceDays: 90,
                },
              },
            ],
          },
        },
      ],
    });

    const mem = memoryLocation({ path: '/workspace?lens=tracelens', record: true });
    render(
      <Router hook={mem.hook}>
        <TraceLensPanel />
      </Router>
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: /Open refactor plan for DB Layer/i })[0]!
    );
    expect(screen.getByTestId('refactor-plan-slide-over')).toBeInTheDocument();
    await waitFor(() => {
      expect(mem.history?.[mem.history.length - 1]).toBe(
        '/workspace/app/designer/db?lens=tracelens&plan=app%2Fdesigner%2Fdb'
      );
    });
    expect(screen.getByText('Refactor plan')).toBeInTheDocument();
    expect(screen.getByTestId('ownership-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('view-offender-source')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('view-offender-source'));
    expect(useBlueprintStore.getState().isSourceCodeOpen).toBe(true);
    expect(useBlueprintStore.getState().sourceCodeFilepath).toBe('src/db.ts');
    expect(useBlueprintStore.getState().sourceCodeProvenance?.remoteUrl).toBe(
      'https://github.com/backstage/backstage'
    );
    await waitFor(() => {
      expect(mem.history?.[mem.history.length - 1]).toBe(
        '/workspace/app/designer/db?lens=tracelens&plan=app%2Fdesigner%2Fdb&source=1'
      );
    });
  });

  it('filters offenders by entity scope in the URL path', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                properties: { containerId: 'designer' },
                forensics: {
                  hotspotScore: 0.85,
                  classifications: ['hotspot'],
                },
              },
              {
                entityRef: 'app/cli/run',
                name: 'CLI Run',
                type: 'component',
                forensics: {
                  hotspotScore: 0.7,
                  classifications: ['hotspot'],
                },
              },
            ],
          },
        },
      ],
    });

    const { hook } = memoryLocation({
      path: '/workspace/app/designer',
      searchPath: 'lens=tracelens',
    });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getByTestId('tracelens-scope-picker')).toBeInTheDocument();
    expect(screen.getAllByText(/DB Layer/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('simulate-failure-app/cli/run')).not.toBeInTheDocument();
    expect(screen.queryByTestId('refactor-plan-slide-over')).not.toBeInTheDocument();
  });

  it('changes entity scope from the picker', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'containers.yaml',
          name: 'containers',
          schema: {
            name: 'App Containers',
            version: '1.0.0',
            level: 'container',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer',
                name: 'Designer',
                type: 'container',
                forensics: { hotspotScore: 0.4, hotspotCount: 2 },
              },
            ],
          },
        },
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                properties: { containerId: 'designer' },
                forensics: {
                  hotspotScore: 0.85,
                  classifications: ['hotspot'],
                },
              },
              {
                entityRef: 'app/designer/api',
                name: 'API Layer',
                type: 'component',
                properties: { containerId: 'designer' },
                forensics: {
                  hotspotScore: 0.75,
                  classifications: ['hotspot'],
                },
              },
              {
                entityRef: 'app/cli/run',
                name: 'CLI Run',
                type: 'component',
                forensics: {
                  hotspotScore: 0.7,
                  classifications: ['hotspot'],
                },
              },
            ],
          },
        },
      ],
      workspaceCatalog: [
        {
          path: 'containers.yaml',
          name: 'App Containers',
          level: 'container',
          entityRef: 'app',
          nodeEntityRefs: ['app/designer'],
        },
        {
          path: 'designer-components.yaml',
          name: 'Designer Components',
          level: 'component',
          entityRef: 'app/designer',
          nodeEntityRefs: ['app/designer/db', 'app/designer/api'],
        },
      ],
    });

    const mem = memoryLocation({ path: '/workspace?lens=tracelens', record: true });
    render(
      <Router hook={mem.hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getAllByText(/CLI Run/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('tracelens-scope-picker-trigger'));
    fireEvent.click(screen.getByTestId('tracelens-scope-option-app/designer'));
    expect(mem.history?.[mem.history.length - 1]).toBe('/workspace/app/designer?lens=tracelens');
    expect(screen.getAllByText(/DB Layer/).length).toBeGreaterThan(0);
  });

  it('opens refactor plan from entity deep link', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.85,
                  classifications: ['hotspot'],
                },
              },
            ],
          },
        },
      ],
    });

    const { hook } = memoryLocation({
      path: '/workspace/app/designer/db',
      searchPath: 'lens=tracelens',
    });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getByTestId('refactor-plan-slide-over')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DB Layer' })).toBeInTheDocument();
  });

  it('opens source dialog from deep link with source=1', async () => {
    useBlueprintStore.setState({
      isSourceCodeOpen: false,
      sourceCodeFilepath: null,
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                properties: { filepath: 'src/db.ts' },
                forensics: {
                  hotspotScore: 0.85,
                  classifications: ['hotspot'],
                },
              },
            ],
          },
        },
      ],
    });

    const mem = memoryLocation({
      path: '/workspace/app/designer/db',
      searchPath: 'lens=tracelens&source=1',
    });
    render(
      <Router hook={mem.hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getByTestId('refactor-plan-slide-over')).toBeInTheDocument();
    await waitFor(() => {
      expect(useBlueprintStore.getState().isSourceCodeOpen).toBe(true);
    });
    expect(useBlueprintStore.getState().sourceCodeFilepath).toBe('src/db.ts');
  });

  it('shows chaos risk context when a ChaosLens simulation is active', () => {
    useBlueprintStore.setState({
      resilienceSimulationResult: {
        heat: new Map([['app/designer/db', 0.72]]),
        heatHops: new Map(),
        integrityHeat: new Map(),
        impactedNodes: ['app/designer/db'],
        integrityImpactedNodes: [],
        entryPointSlas: {},
        overallSla: 28,
        overallIntegrity: 100,
        spofs: [],
        impactedDomains: [],
        integrityImpactedDomains: [],
        advice: [],
        propagationStoppedAt: [],
        faultNodeIds: [],
      },
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.85,
                  classifications: ['hotspot'],
                },
              },
            ],
          },
        },
      ],
    });

    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getByText('CHAOS')).toBeInTheDocument();
    expect(screen.getByTestId('offender-list')).toBeInTheDocument();
  });

  it('starts a ChaosLens simulation from the offender row', async () => {
    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    fireEvent.click(screen.getByTestId('simulate-failure-app/designer/db'));

    await waitFor(() => {
      expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    });
    expect(useBlueprintStore.getState().resilienceFaults).toEqual([
      { nodeId: 'app/designer/db', faultType: 'region-outage', severity: 1 },
    ]);
  });

  it('shows estate recommendations when the recommendations tab is selected', () => {
    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    fireEvent.click(screen.getByRole('button', { name: /^AdviceLens$/i }));
    expect(screen.getByRole('heading', { name: 'All recommendations' })).toBeInTheDocument();
    expect(screen.getByTestId('estate-recommendations-panel')).toBeInTheDocument();
  });

  it('opens the recommendations tab from ?view=recommendations', () => {
    const { hook } = memoryLocation({
      path: '/workspace?lens=tracelens',
      searchPath: 'view=recommendations',
    });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getByRole('heading', { name: 'All recommendations' })).toBeInTheDocument();
    expect(screen.getByTestId('estate-recommendations-panel')).toBeInTheDocument();
  });
});
