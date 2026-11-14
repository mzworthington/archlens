import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useBlueprintStore } from '../application/store/store';
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

type PreviewWindow = Window & {
  acquireVsCodeApi?: () => { postMessage: (message: unknown) => void };
  archlensVscode?: { postMessage: (message: unknown) => void };
};

function installPreviewHost(): unknown[] {
  const messages: unknown[] = [];
  const previewWindow = window as PreviewWindow;
  delete previewWindow.archlensVscode;
  previewWindow.acquireVsCodeApi = () => ({
    postMessage: message => {
      messages.push(message);
    },
  });
  return messages;
}

function isBlueprintSync(message: unknown): message is { type: 'sync'; yaml: string } {
  if (typeof message !== 'object' || message === null) return false;
  const record = message as { type?: unknown; yaml?: unknown };
  return record.type === 'sync' && typeof record.yaml === 'string';
}

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

  it('hides the explorer, header, and resilience controls', async () => {
    render(<CanvasPreview yaml={blueprint} />);

    expect(await screen.findByTestId('react-flow')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /explorer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ARCHLENS/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('toolbar-resilience-lens')).not.toBeInTheDocument();
    expect(screen.queryByTestId('toolbar-resilience-simulate')).not.toBeInTheDocument();
  });

  it('leaves share, mermaid import, chaos specs, and browser scan off the map', async () => {
    render(<CanvasPreview yaml={blueprint} />);

    expect(await screen.findByTestId('react-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('toolbar-share-collab')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'More actions' })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));

    expect(screen.queryByRole('menuitem', { name: 'Import Mermaid' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Browser lite scan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Browse ChaosSpecs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Load ChaosSpec' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Export ChaosSpec' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Compare Systems' })).not.toBeInTheDocument();
  });

  it('keeps a child blueprint in the catalog so a package can open', async () => {
    const child = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: component
metadata:
  entityRef: repo/vscode
  name: Vscode Components
nodes:
  - entityRef: repo/vscode/editorpreview
    type: component
    name: Editor Preview
dependencies: []
`;
    render(
      <CanvasPreview
        yaml={blueprint
          .replace('entityRef: billing', 'entityRef: repo')
          .replace('entityRef: billing/billing-service', 'entityRef: repo/vscode')}
        blueprints={[{ name: 'vscode-components.yaml', content: child }]}
      />
    );

    expect(await screen.findByTestId('react-flow')).toBeInTheDocument();
    expect(
      useBlueprintStore.getState().workspaceCatalog.some(entry => entry.entityRef === 'repo/vscode')
    ).toBe(true);
  });

  it('sends a property edit to the open blueprint and does not ask to save', async () => {
    const messages = installPreviewHost();
    render(<CanvasPreview yaml={blueprint} />);

    expect(await screen.findByTestId('react-flow')).toBeInTheDocument();
    const node = useBlueprintStore
      .getState()
      .nodes.find(item => item.data.name === 'Billing Service');
    expect(node).toBeDefined();
    useBlueprintStore.getState().selectNode(node!.id, { expandPanel: true });
    useBlueprintStore.setState({ rightCollapsed: false, rightPanelTab: 'properties' });

    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Payments' } });

    await waitFor(() => {
      expect(
        messages.some(
          message => isBlueprintSync(message) && message.yaml.includes('name: Payments')
        )
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'More actions' })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.queryByRole('menuitem', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('applies the next diagram the panel posts and leaves the page in place', async () => {
    const messages = installPreviewHost();
    const { container } = render(<CanvasPreview yaml={blueprint} />);
    const page = container.firstElementChild;

    expect(await screen.findByTestId('nodes-count')).toHaveTextContent('2');
    await waitFor(() => {
      expect(messages).toContainEqual({ type: 'ready' });
    });

    const next = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: billing
  name: Billing
nodes:
  - entityRef: billing/treasury
    type: microservice
    name: Treasury
dependencies: []
`;
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'show', yaml: next, hotspots: true } })
    );

    await waitFor(() => {
      expect(screen.getByTestId('nodes-count')).toHaveTextContent('1');
    });
    expect(useBlueprintStore.getState().showHotspotHeatmap).toBe(true);
    expect(container.firstElementChild).toBe(page);
  });

  it('reads the blueprint and hotspot flag the panel embedded', () => {
    document.body.innerHTML =
      '<script type="application/json" id="blueprint">"name: Billing\\n"</script>';
    document.body.dataset.hotspots = 'on';

    expect(readBlueprintPayload()).toEqual({
      yaml: 'name: Billing\n',
      hotspots: true,
      blueprints: [],
    });
  });
});
