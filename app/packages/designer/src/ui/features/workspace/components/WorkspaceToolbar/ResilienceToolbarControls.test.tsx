import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResilienceToolbarControls } from './ResilienceToolbarControls';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('ResilienceToolbarControls', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isResilienceMode: false,
      selectedNodeId: 'shop/payment',
    });
  });

  it('toggles resilience mode from the toolbar', () => {
    render(<ResilienceToolbarControls />);
    fireEvent.click(screen.getByRole('button', { name: /enter resilience mode/i }));
    expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    expect(screen.getByRole('button', { name: /run resilience simulation/i })).toBeInTheDocument();
  });
});
