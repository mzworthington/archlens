import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { DESIGN_THEME_KEY } from '../../../infrastructure/theme/designTheme';
import { DesignSystemDocsPage } from './DesignSystemDocsPage';

vi.mock('../../components/DesignSystemShowcase', () => ({
  DesignSystemShowcase: ({
    embedded,
    activeTab,
    onTabChange,
  }: {
    embedded?: boolean;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
  }) => (
    <div
      data-testid="design-system-showcase"
      data-embedded={embedded ? 'true' : 'false'}
      data-active-tab={activeTab}
    >
      <button type="button" onClick={() => onTabChange?.('tokens')}>
        Switch tab
      </button>
    </div>
  ),
}));

describe('DesignSystemDocsPage', () => {
  it('renders the showcase inside the docs shell', () => {
    const { hook } = memoryLocation({ path: '/design-system' });
    render(
      <Router hook={hook}>
        <DesignSystemDocsPage />
      </Router>
    );

    expect(screen.getByTestId('design-system-showcase')).toHaveAttribute('data-embedded', 'true');
    expect(screen.getByRole('heading', { name: 'Design system' })).toBeInTheDocument();
    expect(screen.getByTestId('docs-mobile-local-nav')).toBeInTheDocument();
    const localNavEl = screen.getByTestId('docs-mobile-local-nav');
    expect(within(localNavEl).getByRole('button', { name: 'Design tokens' })).toBeInTheDocument();
  });

  it('names Blueprint and Light as the design choices', () => {
    localStorage.clear();
    const { hook } = memoryLocation({ path: '/design-system' });
    render(
      <Router hook={hook}>
        <DesignSystemDocsPage />
      </Router>
    );

    expect(screen.getByRole('button', { name: 'Switch to Blueprint' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Light' })).not.toBeInTheDocument();
  });

  it('applies Blueprint to the page and remembers the choice', () => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    const { hook } = memoryLocation({ path: '/design-system' });
    render(
      <Router hook={hook}>
        <DesignSystemDocsPage />
      </Router>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Blueprint' }));

    expect(screen.getByRole('button', { name: 'Switch to Light' })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('blueprint');
    expect(localStorage.getItem(DESIGN_THEME_KEY)).toBe('blueprint');
  });

  it('keeps Light selected after the design system remounts', () => {
    localStorage.setItem(DESIGN_THEME_KEY, 'light');
    delete document.documentElement.dataset.theme;
    const { hook } = memoryLocation({ path: '/design-system' });
    render(
      <Router hook={hook}>
        <DesignSystemDocsPage />
      </Router>
    );

    expect(screen.getByRole('button', { name: 'Switch to Blueprint' })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('activates Light from the keyboard and names it as selected', () => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    const { hook } = memoryLocation({ path: '/design-system' });
    render(
      <Router hook={hook}>
        <DesignSystemDocsPage />
      </Router>
    );

    const toggle = screen.getByRole('button', { name: 'Switch to Blueprint' });
    toggle.focus();
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Switch to Light' })).toHaveFocus();
  });
});
