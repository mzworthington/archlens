import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TraceLensSidePanelContent } from './TraceLensSidePanelContent';
import { useBlueprintStore } from '../../../application/store/store';

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace', vi.fn()],
  Link: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={props.href}>{children}</a>
  ),
}));

describe('TraceLensSidePanelContent', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      leftCollapsed: false,
      activeLeftPanel: 'traceLens',
      selectedNodeId: null,
      showCoupling: false,
      showHotspotHeatmap: true,
    });
    useBlueprintStore.getState().initSchema({
      name: 'Test',
      version: '1.0.0',
      level: 'code',
      nodes: [],
      dependencies: [],
    });
  });

  it('renders worst offenders CTA and canvas lens controls', () => {
    render(<TraceLensSidePanelContent />);
    expect(screen.getByTestId('tracelens-worst-offenders-cta')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-display-controls')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-show-coupling-lens')).toBeInTheDocument();
  });

  it('shows empty selection hint when no node is selected', () => {
    render(<TraceLensSidePanelContent />);
    expect(screen.getByTestId('tracelens-empty-selection')).toBeInTheDocument();
  });

  it('navigates to full trace lens mode from worst offenders CTA', () => {
    render(<TraceLensSidePanelContent />);
    fireEvent.click(screen.getByTestId('tracelens-worst-offenders-cta'));
    expect(useBlueprintStore.getState().isTraceLensMode).toBe(true);
  });

  it('shows readonly git forensics when the selected node is enriched', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Cloud Infrastructure Workspace',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'gateway-api',
          type: 'rest-api',
          name: 'Gateway API',
          position: { x: 0, y: 0 },
          forensics: {
            complexity: 18,
            churn: 4,
            hotspotScore: 0.8,
            classifications: ['hotspot'],
          },
        },
      ],
      dependencies: [],
    });

    const nodeId = useBlueprintStore.getState().nodes[0]?.id;
    useBlueprintStore.setState({ selectedNodeId: nodeId });

    render(<TraceLensSidePanelContent />);

    expect(screen.getByTestId('forensics-section')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-concern-badge')).toHaveTextContent(/Hotspot/i);
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('shows coupling lens hint for a selected node with on-canvas peers', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Code',
      version: '1.0.0',
      level: 'code',
      nodes: [
        {
          entityRef: 'comp-a',
          type: 'component',
          name: 'A',
          position: { x: 0, y: 0 },
          properties: { filepath: 'src/a.ts' },
          forensics: {
            coupledFiles: [{ path: 'src/b.ts', score: 0.85, sharedCommits: 5 }],
          },
        },
        {
          entityRef: 'comp-b',
          type: 'component',
          name: 'B',
          position: { x: 40, y: 40 },
          properties: { filepath: 'src/b.ts' },
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({ selectedNodeId: 'comp-a', showCoupling: true });
    render(<TraceLensSidePanelContent />);

    expect(screen.getByTestId('forensics-coupling-lens-hint')).toHaveTextContent(
      /focusing 1 peer/i
    );
  });
});
