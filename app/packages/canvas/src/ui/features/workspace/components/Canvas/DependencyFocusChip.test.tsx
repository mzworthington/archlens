import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { DependencyFocusChip } from './DependencyFocusChip';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';

function node(id: string, external = false): BlueprintRFNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      id,
      type: 'component',
      name: id,
      entityRef: id,
      properties: {},
      ...(external ? { external: true } : {}),
    },
    type: 'blueprintNode',
  };
}

function edge(source: string, target: string): BlueprintRFEdge {
  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    data: { type: 'direct-call', description: '' },
  };
}

describe('DependencyFocusChip', () => {
  const nodes = [node('a'), node('b'), node('auth', true)];
  const edges = [edge('a', 'b'), edge('b', 'auth')];

  it('promotes to focus-externals when + Externals is clicked', () => {
    const onSetViewMode = vi.fn();
    render(
      <ReactFlowProvider>
        <DependencyFocusChip
          selectedNodeId="b"
          nodes={nodes}
          edges={edges}
          dependencyViewMode="focus"
          isResilienceMode={false}
          onSetViewMode={onSetViewMode}
        />
      </ReactFlowProvider>
    );

    fireEvent.click(screen.getByTestId('dependency-focus-chip-externals'));
    expect(onSetViewMode).toHaveBeenCalledWith('focus-externals');
  });
});
