import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TodayJobs } from './TodayJobs.tsx';

describe('TodayJobs', () => {
  it('shows steps under the selected job and names the action on each card', () => {
    render(<TodayJobs showHeading />);

    expect(screen.getByRole('heading', { name: 'What do I do today?' })).toBeInTheDocument();

    const first = screen.getByRole('button', { pressed: true });
    expect(first.textContent).toMatch(/hide steps/i);
    expect(first.textContent).toMatch(/never used archlens/i);

    const panel = screen.getByRole('region', { name: /i have never used archlens/i });
    expect(within(panel).getByText('Start here:')).toBeInTheDocument();
    expect(first.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(panel.className.split(/\s+/)).toContain('sm:order-last');
    expect(panel.className.split(/\s+/)).not.toContain('order-last');

    fireEvent.click(screen.getByRole('button', { name: /map a folder without installing/i }));
    expect(screen.getByRole('region', { name: /map a folder without installing/i })).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: /fail the pr when architecture regresses/i })
    );

    const ci = screen.getByRole('button', { pressed: true });
    expect(ci.textContent).toMatch(/fail the pr/i);
    expect(ci.textContent).toMatch(/hide steps/i);
    expect(first.getAttribute('aria-pressed')).toBe('false');

    const ciPanel = screen.getByRole('region', {
      name: /fail the pr when architecture regresses/i,
    });
    expect(within(ciPanel).getByText(/archlens validate blueprints/i)).toBeTruthy();
    expect(ci.compareDocumentPosition(ciPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(ci);
    expect(
      screen.queryByRole('region', { name: /fail the pr when architecture regresses/i })
    ).toBeNull();
    expect(ci.getAttribute('aria-pressed')).toBe('false');
    expect(ci.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(ci);
    expect(
      screen.getByRole('region', { name: /fail the pr when architecture regresses/i })
    ).toBeTruthy();
    expect(ci.getAttribute('aria-expanded')).toBe('true');
  });
});
