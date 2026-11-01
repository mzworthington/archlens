import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useModalFocusTrap } from './useModalFocusTrap';

function TrapHarness({ active, onEscape }: { active: boolean; onEscape: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocusTrap(active, ref, onEscape);
  return (
    <div ref={ref} role="dialog" aria-label="Example dialog" tabIndex={-1}>
      <button type="button">First</button>
      <button type="button">Last</button>
    </div>
  );
}

describe('useModalFocusTrap', () => {
  it('names the surface, wraps Tab, and leaves on Escape', () => {
    const onEscape = vi.fn();
    render(
      <div>
        <button type="button">Outside</button>
        <TrapHarness active onEscape={onEscape} />
      </div>
    );

    expect(screen.getByRole('dialog', { name: 'Example dialog' })).toBeInTheDocument();
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('leaves Escape and Tab to an open dialog above a side panel', () => {
    const onEscape = vi.fn();
    render(
      <div>
        <PanelTrap active onEscape={onEscape} />
        <div role="dialog" aria-label="Chaos spec">
          <button type="button">Apply spec</button>
        </div>
      </div>
    );

    const apply = screen.getByRole('button', { name: 'Apply spec' });
    apply.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(apply).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('still leaves a side panel on Escape when the other dialog is closed', () => {
    const onEscape = vi.fn();
    render(
      <div>
        <PanelTrap active onEscape={onEscape} />
        <div role="dialog" aria-label="Chaos spec" className="invisible">
          <button type="button">Apply spec</button>
        </div>
      </div>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

function PanelTrap({ active, onEscape }: { active: boolean; onEscape: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocusTrap(active, ref, onEscape);
  return (
    <div ref={ref} role="tabpanel" aria-label="Resilience" tabIndex={-1}>
      <button type="button">Panel action</button>
    </div>
  );
}
