import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspacePage } from './WorkspacePage';
import { useBlueprintStore } from '../../../application/store/store';

let mockLocation = '/';
const mockSetLocation = vi.fn(newLoc => {
  mockLocation = newLoc;
});
let mockMatch = true;
let mockParams: any = { '*': 'my-system' };

vi.mock('wouter', () => ({
  useLocation: () => {
    const q = mockLocation.indexOf('?');
    return [q >= 0 ? mockLocation.slice(0, q) : mockLocation, mockSetLocation];
  },
  useSearch: () => {
    const q = mockLocation.indexOf('?');
    return q >= 0 ? mockLocation.slice(q + 1) : '';
  },
  useRoute: () => [mockMatch, mockParams],
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Router: ({ children }: any) => <>{children}</>,
}));

vi.mock('./layout/LeftWorkspacePanel', () => ({
  LeftWorkspacePanel: () => <div data-testid="left-panel">Explorer</div>,
}));

vi.mock('./components/Canvas/Canvas', () => ({
  Canvas: () => <div data-testid="canvas">Canvas</div>,
}));

vi.mock('./components/PropertyPanel/PropertyPanel', () => ({
  PropertyPanel: () => <div data-testid="property-panel">PropertyPanel</div>,
}));

vi.mock('./components/Searchbar/Searchbar', () => ({
  Searchbar: () => <div data-testid="searchbar-mock">Searchbar Mock</div>,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReactFlow: () => ({
    getNode: vi.fn(),
    setCenter: vi.fn(),
  }),
}));

describe('WorkspacePage Component', () => {
  beforeEach(() => {
    mockLocation = '/';
    mockMatch = true;
    mockParams = { '*': 'my-system' };
    mockSetLocation.mockClear();

    useBlueprintStore.setState({
      leftCollapsed: true,
      rightCollapsed: true,
      isStartupOpen: false,
      systemSelectInFlight: null,
      isLoading: false,
      diagramLoadCount: 0,
      workspaceName: 'Initial Name',
      currentFilePath: 'initial.yaml',
      schema: {
        name: 'Initial Name',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'initial.yaml',
          name: 'Initial Name',
          schema: {
            name: 'Initial Name',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
        {
          path: 'target.yaml',
          name: 'My System',
          schema: {
            name: 'My System',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });
  });

  it('should render Explorer, Canvas, and PropertyPanel', () => {
    useBlueprintStore.setState({ leftCollapsed: false, rightCollapsed: false });
    render(<WorkspacePage />);

    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('property-panel')).toBeInTheDocument();
  });

  it('should support expanding and collapsing left and right side panels', () => {
    render(<WorkspacePage />);

    const leftToggle = screen.getByLabelText('Toggle left panel');
    const rightToggle = screen.getByLabelText('Toggle right panel');

    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);

    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);

    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);

    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
  });

  it('should synchronize workspace system selection from URL params', () => {
    mockLocation = '/workspace/my-system';
    mockMatch = true;
    mockParams = { '*': 'my-system' };

    useBlueprintStore.setState({
      workspaceName: '',
      workspaceCatalog: [
        {
          path: 'target.yaml',
          name: 'My System',
          level: 'container',
          entityRef: 'my-system',
          nodeEntityRefs: [],
        },
      ],
    });

    const spySelectSystem = vi.spyOn(useBlueprintStore.getState(), 'selectSystem');

    render(<WorkspacePage />);

    expect(spySelectSystem).toHaveBeenCalledWith('target.yaml');
    spySelectSystem.mockRestore();
  });

  it('does not reopen the startup chooser when navigating within the workspace', () => {
    mockLocation = '/workspace/application';
    mockParams = { '*': 'application' };
    useBlueprintStore.setState({ isStartupOpen: false });

    const { rerender } = render(<WorkspacePage />);
    expect(useBlueprintStore.getState().isStartupOpen).toBe(false);

    mockLocation = '/workspace/application/deeper';
    mockParams = { '*': 'application/deeper' };
    rerender(<WorkspacePage />);

    expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
  });

  it('shows the startup chooser on bare workspace with no loaded systems', () => {
    mockLocation = '/workspace';
    mockParams = { '*': '' };
    useBlueprintStore.setState({
      isStartupOpen: true,
      loadedSystems: [],
      isWorkspaceOpen: false,
    });

    render(<WorkspacePage />);

    expect(screen.getByTestId('startup-workspace-dialog')).toBeInTheDocument();
  });
});
