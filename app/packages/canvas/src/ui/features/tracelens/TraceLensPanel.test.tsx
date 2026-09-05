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
      isBrowserLiteWorkspace: false,
      loadedSystems: [
        {
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [{ from: 'app/canvas/db', to: 'app/canvas/ok', type: 'direct-call' }],
            nodes: [
              {
                entityRef: 'app/canvas/db',
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
                entityRef: 'app/canvas/ok',
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

    expect(screen.getByRole('heading', { name: 'Forensics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Worst offenders', level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText(/DB Layer/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^Hotspots$/i }));
    expect(screen.queryByTestId('simulate-failure-app/canvas/ok')).not.toBeInTheDocument();
  });

  it('shows workspace complexity summary for the loaded estate', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [{ from: 'app/canvas/db', to: 'app/canvas/ok', type: 'direct-call' }],
            nodes: [
              {
                entityRef: 'app/canvas/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.85,
                  complexity: 40,
                  loc: 1200,
                  sloc: 900,
                  churn: 6,
                  authorCount: 2,
                  classifications: ['hotspot'],
                  sinceDays: 90,
                },
              },
              {
                entityRef: 'app/canvas/ok',
                name: 'OK',
                type: 'component',
                forensics: {
                  hotspotScore: 0.05,
                  complexity: 2,
                  loc: 80,
                  sloc: 60,
                  classifications: [],
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

    const summary = screen.getByTestId('workspace-complexity-summary');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent('Workspace complexity');
    expect(summary).toHaveTextContent('1,280');
    expect(summary).toHaveTextContent('960');
    expect(summary).toHaveTextContent('Max complexity');
    expect(summary).toHaveTextContent('40');
  });

  it('scopes workspace complexity metrics to the entity scope', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
            version: '1.0.0',
            level: 'component',
            entityRef: 'app/canvas',
            dependencies: [
              { from: 'app/canvas/db', to: 'app/canvas/ok', type: 'direct-call' },
              { from: 'app/canvas/db', to: 'app/cli/run', type: 'direct-call' },
            ],
            nodes: [
              {
                entityRef: 'app/canvas/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.85,
                  complexity: 40,
                  loc: 1200,
                  sloc: 900,
                  classifications: ['hotspot'],
                },
              },
              {
                entityRef: 'app/canvas/ok',
                name: 'OK',
                type: 'component',
                forensics: {
                  hotspotScore: 0.05,
                  complexity: 2,
                  loc: 80,
                  sloc: 60,
                  classifications: [],
                },
              },
              {
                entityRef: 'app/cli/run',
                name: 'CLI Run',
                type: 'component',
                forensics: {
                  hotspotScore: 0.2,
                  complexity: 8,
                  loc: 400,
                  sloc: 300,
                  classifications: [],
                },
              },
            ],
          },
        },
      ],
    });

    const { hook } = memoryLocation({ path: '/workspace/app/canvas/db?lens=tracelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    const summary = screen.getByTestId('workspace-complexity-summary');
    expect(summary).toHaveTextContent('1,200');
    expect(summary).toHaveTextContent('900');
    expect(summary).not.toHaveTextContent('1,680');
    expect(summary).toHaveTextContent('40');
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
    expect(screen.queryByTestId('simulate-failure-app/canvas/ok')).not.toBeInTheDocument();
  });

  it('opens refactor plan slide-over when an offender row is clicked', async () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
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
                entityRef: 'app/canvas/db',
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
        '/workspace/app/canvas/db?lens=tracelens&plan=app%2Fcanvas%2Fdb'
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
        '/workspace/app/canvas/db?lens=tracelens&plan=app%2Fcanvas%2Fdb&source=1'
      );
    });
  });

  it('filters offenders by entity scope in the URL path', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/canvas/db',
                name: 'DB Layer',
                type: 'component',
                properties: { containerId: 'canvas' },
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
      path: '/workspace/app/canvas',
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
                entityRef: 'app/canvas',
                name: 'Canvas',
                type: 'container',
                forensics: { hotspotScore: 0.4, hotspotCount: 2 },
              },
            ],
          },
        },
        {
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/canvas/db',
                name: 'DB Layer',
                type: 'component',
                properties: { containerId: 'canvas' },
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
      workspaceCatalog: [
        {
          path: 'containers.yaml',
          name: 'App Containers',
          level: 'container',
          entityRef: 'app',
          nodeEntityRefs: ['app/canvas'],
        },
        {
          path: 'canvas-components.yaml',
          name: 'Canvas Components',
          level: 'component',
          entityRef: 'app/canvas',
          nodeEntityRefs: ['app/canvas/db'],
        },
      ],
    });

    const mem = memoryLocation({ path: '/workspace?lens=tracelens', record: true });
    render(
      <Router hook={mem.hook}>
        <TraceLensPanel />
      </Router>
    );

    fireEvent.click(screen.getByTestId('tracelens-scope-picker-trigger'));
    fireEvent.click(screen.getByTestId('tracelens-scope-option-app/canvas'));
    expect(mem.history?.[mem.history.length - 1]).toBe('/workspace/app/canvas?lens=tracelens');
    expect(screen.getAllByText(/DB Layer/).length).toBeGreaterThan(0);
  });

  it('opens refactor plan from entity deep link', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/canvas/db',
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
      path: '/workspace/app/canvas/db',
      searchPath: 'lens=tracelens&plan=app%2Fcanvas%2Fdb',
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
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/canvas/db',
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
      path: '/workspace/app/canvas/db',
      searchPath: 'lens=tracelens&plan=app%2Fcanvas%2Fdb&source=1',
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
        heat: new Map([['app/canvas/db', 0.72]]),
        heatHops: new Map(),
        integrityHeat: new Map(),
        impactedNodes: ['app/canvas/db'],
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
          path: 'canvas-components.yaml',
          name: 'canvas',
          schema: {
            name: 'Canvas Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/canvas/db',
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

  it('shows estate recommendations when the recommendations tab is selected', () => {
    const { hook } = memoryLocation({ path: '/workspace?lens=advicelens' });
    render(
      <Router hook={hook}>
        <TraceLensPanel />
      </Router>
    );

    expect(screen.getByTestId('estate-recommendations-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Forensics', level: 1 })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Worst offenders', level: 2 })
    ).not.toBeInTheDocument();
  });

  it('switches to AdviceLens URL when the recommendations tab is selected', () => {
    const mem = memoryLocation({ path: '/workspace?lens=tracelens', record: true });
    render(
      <Router hook={mem.hook}>
        <TraceLensPanel />
      </Router>
    );

    fireEvent.click(screen.getByRole('button', { name: /^AdviceLens$/i }));

    expect(mem.history?.[mem.history.length - 1]).toBe('/workspace?lens=advicelens');
  });

  it('does not tell a browser-scan workspace that git hotspots exist here', () => {
    useBlueprintStore.setState({
      isBrowserLiteWorkspace: true,
      isWorkspaceOpen: true,
      loadedSystems: [
        {
          path: 'demo/context.yaml',
          name: 'demo',
          schema: {
            name: 'Demo',
            version: '1.0.0',
            level: 'context',
            dependencies: [],
            nodes: [{ entityRef: 'demo/web', name: 'Web', type: 'web-app' }],
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

    expect(screen.getByTestId('workspace-complexity-summary')).toHaveTextContent(
      /structure-only browser scan/i
    );
    expect(screen.queryByText(/Re-scan with git/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/git hotspots exist/i)).not.toBeInTheDocument();
  });
});
