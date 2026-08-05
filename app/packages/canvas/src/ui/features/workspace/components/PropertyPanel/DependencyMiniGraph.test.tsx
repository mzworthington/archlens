import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DependencyMiniGraph } from './DependencyMiniGraph';

describe('DependencyMiniGraph', () => {
  it('renders upstream and downstream peers', () => {
    render(
      <DependencyMiniGraph
        centerLabel="API"
        upstream={[{ entityRef: 'gateway', name: 'Gateway', hop: 1 }]}
        downstream={[{ entityRef: 'db', name: 'Database', hop: 1 }]}
        upstreamTotal={1}
        downstreamTotal={1}
      />
    );

    expect(screen.getByTestId('dependency-mini-graph')).toBeInTheDocument();
    expect(screen.getByTestId('dependency-peer-gateway')).toBeInTheDocument();
    expect(screen.getByTestId('dependency-peer-db')).toBeInTheDocument();
  });

  it('calls onPeerClick when a peer is selected', () => {
    const onPeerClick = vi.fn();
    render(
      <DependencyMiniGraph
        centerLabel="API"
        upstream={[{ entityRef: 'gateway', name: 'Gateway', hop: 1 }]}
        downstream={[]}
        upstreamTotal={1}
        downstreamTotal={0}
        onPeerClick={onPeerClick}
      />
    );

    fireEvent.click(screen.getByTestId('dependency-peer-gateway'));
    expect(onPeerClick).toHaveBeenCalledWith('gateway');
  });

  it('shows overflow counts when peers are capped', () => {
    render(
      <DependencyMiniGraph
        centerLabel="API"
        upstream={[{ entityRef: 'a', name: 'A', hop: 1 }]}
        downstream={[]}
        upstreamTotal={4}
        downstreamTotal={0}
      />
    );

    expect(screen.getByText('+3 upstream')).toBeInTheDocument();
  });
});
