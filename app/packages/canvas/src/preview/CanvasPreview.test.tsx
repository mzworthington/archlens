import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasPreview } from './CanvasPreview';
import { readBlueprintPayload } from './webview';

vi.mock('wouter', () => ({
  useLocation: () => ['/preview', vi.fn()],
  useSearch: () => '',
  useRoute: () => [false, null],
  Router: ({ children }: { children?: ReactNode }) => children,
  Link: ({ children, to }: { children?: ReactNode; to?: string }) => <a href={to}>{children}</a>,
}));

vi.mock('@xyflow/react', () => {
  type MockFlowNode = { id: string; data?: { entityRef?: string; hotspotHeat?: number } };
  type MockReactFlowProps = {
    children?: ReactNode;
    nodes: MockFlowNode[];
    edges: unknown[];
  };
  type MockPanelProps = {
    children?: ReactNode;
    position?: string;
    'data-testid'?: string;
  };

  return {
    ReactFlow: ({ children, nodes, edges }: MockReactFlowProps) => (
      <div data-testid="react-flow">
        <div data-testid="nodes-count">{nodes.length}</div>
        <div data-testid="edges-count">{edges.length}</div>
        {children}
      </div>
    ),
    Background: () => <div data-testid="background" />,
    Controls: ({ children }: { children?: ReactNode }) => (
      <div data-testid="controls">{children}</div>
    ),
    MiniMap: () => <div data-testid="minimap" />,
    Panel: ({ children, position, ...props }: MockPanelProps) => (
      <div data-testid={props['data-testid'] ?? `panel-${position}`}>{children}</div>
    ),
    BackgroundVariant: { Dots: 'dots' },
    ReactFlowProvider: ({ children }: { children?: ReactNode }) => children,
    useReactFlow: () => ({
      fitView: vi.fn(),
      setViewport: vi.fn(),
      getInternalNode: () => undefined,
      screenToFlowPosition: (pos: { x: number; y: number }) => pos,
    }),
    useStore: (select: (state: { transform: [number, number, number] }) => unknown) =>
      select({ transform: [0, 0, 1] }),
    ViewportPortal: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  };
});

const blueprint = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: billing
  name: Billing
nodes:
  - entityRef: billing/billing-service
    type: microservice
    name: Billing Service
  - entityRef: billing/payment-gateway
    type: software-system
    name: External Payment Processor
    external: true
dependencies:
  - from: billing/billing-service
    to: billing/payment-gateway
    type: direct-call
`;

describe('canvas preview', () => {
  it('draws a blueprint with the workspace canvas', async () => {
    render(<CanvasPreview yaml={blueprint} />);

    expect(await screen.findByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('nodes-count')).toHaveTextContent('2');
    expect(screen.getByTestId('edges-count')).toHaveTextContent('1');
    expect(screen.getByTestId('background')).toBeInTheDocument();
  });

  it('mounts the workspace around the canvas', async () => {
    render(<CanvasPreview yaml={blueprint} />);

    expect(await screen.findByRole('button', { name: 'Show explorer' })).toBeInTheDocument();
  });

  it('reads the blueprint and hotspot flag the panel embedded', () => {
    document.body.innerHTML =
      '<script type="application/json" id="blueprint">"name: Billing\\n"</script>';
    document.body.dataset.hotspots = 'on';

    expect(readBlueprintPayload()).toEqual({ yaml: 'name: Billing\n', hotspots: true });
  });
});
