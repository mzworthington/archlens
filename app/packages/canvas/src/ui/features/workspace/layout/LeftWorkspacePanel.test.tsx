import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftWorkspacePanel } from './LeftWorkspacePanel';
import { useBlueprintStore } from '../../../../application/store/store';

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace', vi.fn()],
}));

describe('LeftWorkspacePanel', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      leftCollapsed: false,
      activeLeftPanel: 'traceLens',
    });
    useBlueprintStore.getState().initSchema({
      name: 'Test',
      version: '1.0.0',
      level: 'code',
      nodes: [],
      dependencies: [],
    });
  });

  it('switches between TraceLens and Schema tabs without closing the panel', () => {
    render(<LeftWorkspacePanel />);

    expect(screen.getByTestId('tracelens-worst-offenders-cta')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('left-tab-schema'));
    expect(useBlueprintStore.getState().activeLeftPanel).toBe('codeViewer');
    expect(screen.getByRole('button', { name: /^yaml$/i })).toBeInTheDocument();
    expect(screen.queryByTestId('tracelens-worst-offenders-cta')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('left-tab-tracelens'));
    expect(useBlueprintStore.getState().activeLeftPanel).toBe('traceLens');
    expect(screen.getByTestId('tracelens-worst-offenders-cta')).toBeInTheDocument();
  });
});
