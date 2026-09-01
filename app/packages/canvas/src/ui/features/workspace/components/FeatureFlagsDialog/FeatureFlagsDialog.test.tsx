import { describe, expect, it, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  COLLABORATION_FEATURE,
  featureStorageKey,
} from '../../../../../application/navigation/featureGate';
import { FeatureFlagsDialog } from './FeatureFlagsDialog';

afterEach(() => {
  localStorage.removeItem(featureStorageKey(COLLABORATION_FEATURE));
});

describe('FeatureFlagsDialog', () => {
  it('renders a labelled switch for each catalogued flag', () => {
    render(<FeatureFlagsDialog isOpen onClose={() => undefined} />);

    expect(screen.getByRole('dialog', { name: 'Feature flags' })).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Live collaboration' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('persists a toggle in this browser', () => {
    render(<FeatureFlagsDialog isOpen onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Live collaboration' }));
    expect(screen.getByRole('switch', { name: 'Live collaboration' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(localStorage.getItem(featureStorageKey(COLLABORATION_FEATURE))).toBe('1');
  });

  it('does not render when closed', () => {
    render(<FeatureFlagsDialog isOpen={false} onClose={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
