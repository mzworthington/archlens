import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceDisplayControls } from './WorkspaceDisplayControls';

const defaultCounts = {
  upstreamExternals: 2,
  downstreamExternals: 3,
  tests: 4,
  dependencies: 8,
};

describe('WorkspaceDisplayControls', () => {
  it('exposes workspace-wide display toggles including selected-deps focus', () => {
    const onToggleTests = vi.fn();
    const onToggleUpstreamExternals = vi.fn();
    const onToggleDownstreamExternals = vi.fn();
    const onToggleSelectedDeps = vi.fn();
    const onToggleHeat = vi.fn();
    const onToggleLite = vi.fn();
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
        liteCanvas={false}
        onToggleLiteCanvas={onToggleLite}
        counts={defaultCounts}
        countsScopedToNode={false}
      />
    );

    expect(screen.getByTestId('workspace-display-controls')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-display-summary')).toHaveTextContent(
      '2↑ 3↓ ext · 4 tests · 8 deps'
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
    fireEvent.click(screen.getByTestId('toggle-lite-canvas'));
    expect(onToggleTests).toHaveBeenCalledTimes(1);
    expect(onToggleUpstreamExternals).toHaveBeenCalledTimes(1);
    expect(onToggleDownstreamExternals).toHaveBeenCalledTimes(1);
    expect(onToggleSelectedDeps).toHaveBeenCalledTimes(1);
    expect(onToggleHeat).toHaveBeenCalledTimes(1);
    expect(onToggleLite).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Show Selected Dependencies Only (8)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show upstream externals (2)' })).toHaveTextContent(
      'Upstream (2)'
    );
    expect(screen.getByRole('button', { name: 'Show downstream externals (3)' })).toHaveTextContent(
      'Downstream (3)'
    );
    expect(screen.getByTestId('workspace-heatmap-help')).toHaveTextContent(
      /TraceLens hotspot score/i
    );
    expect(screen.getByTestId('workspace-lite-canvas-help')).toHaveTextContent(
      /Faster pan and zoom/i
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
        liteCanvas={false}
        onToggleLiteCanvas={vi.fn()}
        counts={{ upstreamExternals: 1, downstreamExternals: 0, tests: 0, dependencies: 3 }}
        countsScopedToNode
      />
    );

    expect(screen.getByTestId('workspace-display-summary')).toHaveTextContent(
      '1↑ 0↓ ext · 0 tests · 3 deps · node'
    );
  });
});
