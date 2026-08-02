import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceDisplayControls } from './WorkspaceDisplayControls';

const defaultCounts = {
  upstreamExternals: 2,
  downstreamExternals: 3,
  tests: 4,
  dependencies: 8,
  coupledNodes: 6,
};

describe('WorkspaceDisplayControls', () => {
  it('exposes workspace-wide display toggles including selected-deps focus', () => {
    const onToggleTests = vi.fn();
    const onToggleUpstreamExternals = vi.fn();
    const onToggleDownstreamExternals = vi.fn();
    const onToggleSelectedDeps = vi.fn();
    const onToggleHeat = vi.fn();
    const onToggleCoupling = vi.fn();
    const onToggleCouplingSchemaDeps = vi.fn();
    render(
      <WorkspaceDisplayControls
        showTests={false}
        onToggleShowTests={onToggleTests}
        showUpstreamExternals={true}
        onToggleShowUpstreamExternals={onToggleUpstreamExternals}
        showDownstreamExternals={false}
        onToggleShowDownstreamExternals={onToggleDownstreamExternals}
        showSelectedDependenciesOnly={false}
        onToggleShowSelectedDependenciesOnly={onToggleSelectedDeps}
        showHotspotHeatmap={false}
        onToggleShowHotspotHeatmap={onToggleHeat}
        showCoupling={false}
        onToggleShowCoupling={onToggleCoupling}
        showCouplingSchemaDeps={false}
        onToggleShowCouplingSchemaDeps={onToggleCouplingSchemaDeps}
        counts={defaultCounts}
        countsScopedToNode={false}
      />
    );

    expect(screen.getByTestId('workspace-display-controls')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-display-summary')).toHaveTextContent(
      '2 callers · 3 targets · 4 tests · 8 deps'
    );
    expect(screen.getByTestId('toggle-show-tests-count')).toHaveTextContent('(4)');
    expect(screen.getByTestId('toggle-show-upstream-externals-count')).toHaveTextContent('(2)');
    expect(screen.getByTestId('toggle-show-downstream-externals-count')).toHaveTextContent('(3)');
    expect(screen.getByTestId('toggle-show-selected-dependencies-only-count')).toHaveTextContent(
      '(8)'
    );
    fireEvent.click(screen.getByTestId('toggle-show-tests'));
    fireEvent.click(screen.getByTestId('toggle-show-upstream-externals'));
    fireEvent.click(screen.getByTestId('toggle-show-downstream-externals'));
    fireEvent.click(screen.getByTestId('toggle-show-selected-dependencies-only'));
    fireEvent.click(screen.getByTestId('toggle-show-hotspot-heatmap'));
    fireEvent.click(screen.getByTestId('toggle-show-coupling-lens'));
    expect(onToggleTests).toHaveBeenCalledTimes(1);
    expect(onToggleUpstreamExternals).toHaveBeenCalledTimes(1);
    expect(onToggleDownstreamExternals).toHaveBeenCalledTimes(1);
    expect(onToggleSelectedDeps).toHaveBeenCalledTimes(1);
    expect(onToggleHeat).toHaveBeenCalledTimes(1);
    expect(onToggleCoupling).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Show Selected Dependencies Only (8)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show external callers (2)' })).toHaveTextContent(
      'Callers (2)'
    );
    expect(screen.getByRole('button', { name: 'Show external targets (3)' })).toHaveTextContent(
      'Targets (3)'
    );
    expect(screen.getByTestId('workspace-heatmap-help')).toHaveTextContent(
      /TraceLens hotspot score/i
    );
  });

  it('marks the summary when counts are scoped to the selected node', () => {
    render(
      <WorkspaceDisplayControls
        showTests={false}
        onToggleShowTests={vi.fn()}
        showUpstreamExternals={true}
        onToggleShowUpstreamExternals={vi.fn()}
        showDownstreamExternals={true}
        onToggleShowDownstreamExternals={vi.fn()}
        showSelectedDependenciesOnly={false}
        onToggleShowSelectedDependenciesOnly={vi.fn()}
        showHotspotHeatmap={false}
        onToggleShowHotspotHeatmap={vi.fn()}
        showCoupling={false}
        onToggleShowCoupling={vi.fn()}
        showCouplingSchemaDeps={false}
        onToggleShowCouplingSchemaDeps={vi.fn()}
        counts={{
          upstreamExternals: 1,
          downstreamExternals: 0,
          tests: 0,
          dependencies: 3,
          coupledNodes: 0,
        }}
        countsScopedToNode
      />
    );

    expect(screen.getByTestId('workspace-display-summary')).toHaveTextContent(
      '1 callers · 0 targets · 0 tests · 3 deps · node'
    );
  });

  it('disables caller and target toggles when dependency focus is active', () => {
    render(
      <WorkspaceDisplayControls
        showTests={false}
        onToggleShowTests={vi.fn()}
        showUpstreamExternals={true}
        onToggleShowUpstreamExternals={vi.fn()}
        showDownstreamExternals={true}
        onToggleShowDownstreamExternals={vi.fn()}
        showSelectedDependenciesOnly={true}
        onToggleShowSelectedDependenciesOnly={vi.fn()}
        showHotspotHeatmap={false}
        onToggleShowHotspotHeatmap={vi.fn()}
        showCoupling={false}
        onToggleShowCoupling={vi.fn()}
        showCouplingSchemaDeps={false}
        onToggleShowCouplingSchemaDeps={vi.fn()}
        counts={defaultCounts}
        countsScopedToNode={false}
        dependencyFocusActive
      />
    );

    expect(screen.getByRole('button', { name: 'Show external callers (2)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show external targets (3)' })).toBeDisabled();
  });

  it('locks caller and target toggles on at C4 context level', () => {
    render(
      <WorkspaceDisplayControls
        showTests={false}
        onToggleShowTests={vi.fn()}
        showUpstreamExternals={false}
        onToggleShowUpstreamExternals={vi.fn()}
        showDownstreamExternals={false}
        onToggleShowDownstreamExternals={vi.fn()}
        showSelectedDependenciesOnly={false}
        onToggleShowSelectedDependenciesOnly={vi.fn()}
        showHotspotHeatmap={false}
        onToggleShowHotspotHeatmap={vi.fn()}
        showCoupling={false}
        onToggleShowCoupling={vi.fn()}
        showCouplingSchemaDeps={false}
        onToggleShowCouplingSchemaDeps={vi.fn()}
        counts={defaultCounts}
        countsScopedToNode={false}
        contextLevelAlwaysShowExternals
      />
    );

    const callers = screen.getByRole('button', { name: 'Show external callers (2)' });
    const targets = screen.getByRole('button', { name: 'Show external targets (3)' });
    expect(callers).toBeDisabled();
    expect(targets).toBeDisabled();
    expect(callers).toHaveAttribute('aria-pressed', 'true');
    expect(targets).toHaveAttribute('aria-pressed', 'true');
  });
});
