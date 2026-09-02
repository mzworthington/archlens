import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspacePanelRail } from './WorkspacePanelRail';

const baseProps = {
  onToggle: vi.fn(),
  panelWidthPx: '20rem',
  expandTitle: 'Show properties',
  collapseTitle: 'Hide properties',
};

describe('WorkspacePanelRail', () => {
  it('uses a panel icon when collapsed and no visible Props label', () => {
    render(<WorkspacePanelRail slot="right" collapsed {...baseProps} />);

    const rail = screen.getByTestId('right-panel-rail');
    expect(rail).toHaveAccessibleName('Show properties');
    expect(rail).toHaveAttribute('aria-expanded', 'false');
    expect(rail).not.toHaveTextContent(/props/i);
    expect(rail).toContainElement(screen.getByTestId('right-panel-rail-icon'));
    expect(screen.queryByTestId('right-panel-rail-chevron')).not.toBeInTheDocument();
  });

  it('uses a collapse chevron when the panel is open', () => {
    render(<WorkspacePanelRail slot="right" collapsed={false} {...baseProps} />);

    const rail = screen.getByTestId('right-panel-rail');
    expect(rail).toHaveAccessibleName('Hide properties');
    expect(rail).toHaveAttribute('aria-expanded', 'true');
    expect(rail).not.toHaveTextContent(/props/i);
    expect(rail).toContainElement(screen.getByTestId('right-panel-rail-chevron'));
  });
});
