import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasZoomReadout } from './CanvasZoomReadout';

vi.mock('@xyflow/react', () => ({
  useStore: (select: (state: { transform: [number, number, number] }) => number) =>
    select({ transform: [0, 0, 0.55] }),
}));

describe('CanvasZoomReadout', () => {
  it('shows the current zoom as a percent on the viewport controls', () => {
    render(<CanvasZoomReadout />);
    const readout = screen.getByTestId('canvas-zoom-percent');
    expect(readout).toHaveTextContent('55%');
    expect(readout).toHaveAccessibleName('Canvas zoom 55%');
    expect(readout).toHaveClass('canvas-zoom-readout');
  });
});
