import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
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
});
