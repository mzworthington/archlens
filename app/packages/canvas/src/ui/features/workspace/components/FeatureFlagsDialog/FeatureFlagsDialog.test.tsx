import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FEATURE_FLAGS } from '../../../../../application/navigation/featureGate';
import { FeatureFlagsDialog } from './FeatureFlagsDialog';

describe('FeatureFlagsDialog', () => {
  it('shows an empty state when no flags are catalogued', () => {
    expect(FEATURE_FLAGS).toEqual([]);
    render(<FeatureFlagsDialog isOpen onClose={() => undefined} />);

    expect(screen.getByRole('dialog', { name: 'Feature flags' })).toBeInTheDocument();
    expect(screen.getByText('No preview features right now.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<FeatureFlagsDialog isOpen={false} onClose={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
