import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DocsShell, type DocsLocalNav } from './DocsShell';

const localNav: DocsLocalNav = {
  title: 'On this page',
  expandUnderPath: '/design-system',
  items: [
    { id: 'identity', label: 'Identity & grid' },
    { id: 'tokens', label: 'Design tokens' },
  ],
  activeId: 'identity',
  onSelect: vi.fn(),
};

vi.mock('wouter', () => ({
  useLocation: () => ['/design-system'],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../components/AppHeader', () => ({
  AppHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
}));

describe('DocsShell', () => {
  it('shows separate mobile scrollers for product guide and reference', () => {
    render(
      <DocsShell>
        <p>content</p>
      </DocsShell>
    );

    const guideNav = screen.getByTestId('docs-mobile-guide-nav');
    expect(guideNav.parentElement).toHaveTextContent('Product guide');
    expect(within(guideNav).getByRole('link', { name: 'Overview' })).toBeInTheDocument();

    const referenceNav = screen.getByTestId('docs-mobile-reference-nav');
    expect(referenceNav.parentElement).toHaveTextContent('Reference');
    expect(within(referenceNav).getByRole('link', { name: 'Design system' })).toBeInTheDocument();
  });

  it('shows local section nav on mobile and nested sidebar items when provided', () => {
    render(
      <DocsShell localNav={localNav}>
        <p>content</p>
      </DocsShell>
    );

    const localNavEl = screen.getByTestId('docs-mobile-local-nav');
    expect(localNavEl.parentElement).toHaveTextContent('On this page');
    expect(within(localNavEl).getByRole('button', { name: 'Design tokens' })).toBeInTheDocument();

    const sidebar = screen.getByTestId('docs-sidebar');
    expect(within(sidebar).getByRole('button', { name: 'Identity & grid' })).toBeInTheDocument();
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Design tokens' }));
    expect(localNav.onSelect).toHaveBeenCalledWith('tokens');
  });
});
