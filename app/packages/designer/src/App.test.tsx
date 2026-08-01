import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspacePage } from './ui/features/workspace/WorkspacePage';
import { AppProvider } from './application/context/AppContext';
import { useBlueprintStore } from './application/store/store';

let mockLocation = '/workspace/empty-workspace';
const mockSetLocation = vi.fn((newLoc: string) => {
  mockLocation = newLoc;
});
let mockMatch = true;
let mockParams: { '*': string } = { '*': 'empty-workspace' };

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
}));

vi.mock('./ui/features/workspace/components/Searchbar/Searchbar', () => ({
  Searchbar: () => <div data-testid="searchbar-mock">Searchbar Mock</div>,
}));

vi.mock('./ui/features/workspace/components/Canvas/Canvas', () => ({
  Canvas: () => <div data-testid="canvas-mock">Canvas Mock</div>,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
  useReactFlow: () => ({
    getNode: vi.fn(),
    setCenter: vi.fn(),
  }),
}));

describe('App Layout and Collapsible Panels', () => {
  beforeEach(() => {
    mockLocation = '/workspace/empty-workspace';
    mockMatch = true;
    mockParams = { '*': 'empty-workspace' };
    mockSetLocation.mockClear();

    useBlueprintStore.setState({
      currentFilePath: 'blueprint.yaml',
      workspaceName: undefined,
      isWorkspaceOpen: false,
      leftCollapsed: true,
      rightCollapsed: true,
      isStartupOpen: false,
      systemSelectInFlight: null,
      isLoading: false,
      diagramLoadCount: 0,
      schema: {
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'container',
        entityRef: 'empty-workspace',
        nodes: [],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'blueprint.yaml',
          name: 'Empty Workspace',
          schema: {
            name: 'Empty Workspace',
            version: '1.0.0',
            level: 'container',
            entityRef: 'empty-workspace',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });
  });

  it('should have panels hidden by default and support toggling them', () => {
    render(
      <AppProvider>
        <WorkspacePage />
      </AppProvider>
    );

    const leftToggle = screen.getByLabelText('Toggle Left Panel');
    const rightToggle = screen.getByLabelText('Toggle Right Panel');
    expect(leftToggle).toBeInTheDocument();
    expect(rightToggle).toBeInTheDocument();

    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);

    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);

    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);

    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);

    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
  });
});
