import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiteCanvasButton } from './LiteCanvasButton';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('LiteCanvasButton', () => {
  beforeEach(() => {
    useBlueprintStore.setState({ liteCanvas: false });
  });

  it('toggles lite canvas from the bottom toolbar', () => {
    render(<LiteCanvasButton />);
    fireEvent.click(screen.getByTestId('toolbar-lite-canvas'));
    expect(useBlueprintStore.getState().liteCanvas).toBe(true);
    fireEvent.click(screen.getByTestId('toolbar-lite-canvas'));
    expect(useBlueprintStore.getState().liteCanvas).toBe(false);
  });
});
