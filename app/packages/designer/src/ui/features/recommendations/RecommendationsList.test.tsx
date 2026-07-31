import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Recommendation } from '@archlens/core/recommendations';
import { RecommendationsList } from './RecommendationsList';

const sample: Recommendation[] = [
  {
    id: 'add-circuit-breaker:shop/web:shop/api',
    kind: 'add-circuit-breaker',
    source: 'chaoslens',
    targetEntityRef: 'shop/web',
    targetName: 'Web App',
    title: 'Add a circuit breaker on outbound call',
    detail:
      'Add a circuit breaker on calls from Web App to API — shared dependency with fan-in and no isolation.',
    priority: 95,
    evidence: {
      applicabilityScope: {
        entityRef: 'shop/api',
        name: 'API',
      },
    },
    actions: [
      {
        kind: 'enable-circuit-breaker',
        label: 'Enable circuit breaker on Web App',
        targetEntityRef: 'shop/web',
      },
    ],
  },
];

describe('RecommendationsList', () => {
  it('renders ranked recommendations with source labels', () => {
    render(<RecommendationsList recommendations={sample} />);
    expect(screen.getByTestId('recommendations-list')).toBeInTheDocument();
    expect(screen.getByText('Add a circuit breaker on outbound call')).toBeInTheDocument();
    expect(screen.getByText(/Scope: API/)).toBeInTheDocument();
    expect(screen.getByText(/ChaosLens/)).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('renders empty message when provided', () => {
    render(<RecommendationsList recommendations={[]} emptyMessage="No recommendations yet." />);
    expect(screen.getByText('No recommendations yet.')).toBeInTheDocument();
  });

  it('renders action buttons and handles clicks', () => {
    const onAction = vi.fn();
    render(<RecommendationsList recommendations={sample} onAction={onAction} />);
    fireEvent.click(screen.getByTestId('recommendation-action-enable-circuit-breaker'));
    expect(onAction).toHaveBeenCalled();
  });

  it('renders narration detail and AdviceLens label when present', () => {
    render(
      <RecommendationsList
        recommendations={[
          {
            ...sample[0],
            narration: {
              provider: 'adviceLens',
              detail: 'Set a 200ms timeout with fallback cache on API.',
              citations: ['blastRadius:0.80'],
            },
          },
        ]}
      />
    );
    expect(screen.getByText('Set a 200ms timeout with fallback cache on API.')).toBeInTheDocument();
    expect(screen.getByText(/ChaosLens · AdviceLens/)).toBeInTheDocument();
  });
});
