import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConnectionsSection } from './ConnectionsSection';
import type { BlueprintRFEdge } from '../../../../../application/store/layoutUtils';

const edge: BlueprintRFEdge = {
  id: 'edge-a-b',
  source: 'a',
  target: 'b',
  data: { type: 'direct-call', description: 'calls' },
};

describe('ConnectionsSection', () => {
  it('spotlights a connection when the crosshair is clicked', () => {
    const onSpotlightConnection = vi.fn();
    render(
      <ConnectionsSection
        selectedNodeId="a"
        schemaNodes={[{ entityRef: 'b', name: 'BuildId', type: 'component', properties: {} }]}
        connections={[edge]}
        upstreamTotal={0}
        downstreamTotal={1}
        selectedConnectionId={null}
        onSelectNode={vi.fn()}
        onSpotlightConnection={onSpotlightConnection}
        onUpdateDependency={vi.fn()}
        onDeleteDependency={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('spotlight-connection-edge-a-b'));
    expect(onSpotlightConnection).toHaveBeenCalledWith('edge-a-b');
  });
});
