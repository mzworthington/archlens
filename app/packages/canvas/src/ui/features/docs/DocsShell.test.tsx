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
  it('shows one mobile chapter scroller for the active section, with tabs to switch', () => {
    render(
      <DocsShell>
        <p>content</p>
      </DocsShell>
    );

    const tabs = screen.getByTestId('docs-mobile-section-tabs');
    expect(within(tabs).getByRole('tab', { name: 'Start' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(within(tabs).getByRole('tab', { name: 'Tech' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    const technologyNav = screen.getByTestId('docs-mobile-tech-nav');
    expect(technologyNav).toHaveAttribute('aria-label', 'Tech');
    expect(within(technologyNav).getByRole('link', { name: 'Design system' })).toBeInTheDocument();
    expect(
      within(technologyNav).getByRole('link', { name: 'Technology stack' })
    ).toBeInTheDocument();
    expect(
      within(technologyNav).getByRole('link', { name: 'GitHub Actions workflows' })
    ).toBeInTheDocument();
    expect(
      within(technologyNav).getByRole('link', { name: 'Setup & local development' })
    ).toBeInTheDocument();
    expect(
      within(technologyNav).getByRole('link', { name: 'Architecture & security' })
    ).toBeInTheDocument();
    expect(within(technologyNav).getByRole('link', { name: 'ADRs' })).toHaveAttribute(
      'href',
      '/ADRs'
    );
    expect(within(technologyNav).getByRole('link', { name: 'Changelog' })).toHaveAttribute(
      'href',
      '/changelog'
    );
    expect(
      within(technologyNav).getByRole('link', { name: 'ChaosLens engine' })
    ).toBeInTheDocument();
    expect(
      within(technologyNav).getByRole('link', { name: 'AdviceLens engine' })
    ).toBeInTheDocument();

    expect(screen.queryByTestId('docs-mobile-start-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-mobile-learn-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-mobile-surfaces-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-mobile-contract-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-mobile-design-system-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-mobile-guide-nav')).not.toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole('tab', { name: 'Start' }));
    const startNav = screen.getByTestId('docs-mobile-start-nav');
    expect(within(startNav).getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(within(startNav).getByRole('link', { name: 'Jobs for today' })).toBeInTheDocument();
    expect(
      within(startNav).getByRole('link', { name: 'Interface tour & journeys' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('docs-mobile-tech-nav')).not.toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole('tab', { name: 'Learn' }));
    const learnNav = screen.getByTestId('docs-mobile-learn-nav');
    expect(within(learnNav).getByRole('link', { name: 'Getting started' })).toHaveAttribute(
      'href',
      '/tutorials/getting-started'
    );

    fireEvent.click(within(tabs).getByRole('tab', { name: 'Surfaces' }));
    const surfacesNav = screen.getByTestId('docs-mobile-surfaces-nav');
    expect(within(surfacesNav).getByRole('link', { name: 'ArchLens Canvas' })).toBeInTheDocument();
    expect(within(surfacesNav).getByRole('link', { name: 'ArchLens CLI' })).toBeInTheDocument();
    expect(within(surfacesNav).getByRole('link', { name: 'AdviceLens' })).toBeInTheDocument();
    expect(within(surfacesNav).getByRole('link', { name: 'BlueprintSpec' })).toBeInTheDocument();
  });

  it('shows header hubs for Start, Learn, Surfaces and Tech', () => {
    render(
      <DocsShell>
        <p>content</p>
      </DocsShell>
    );

    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/guide');
    expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute(
      'href',
      '/tutorials/getting-started'
    );
    expect(screen.getByRole('link', { name: 'Surfaces' })).toHaveAttribute('href', '/guide/canvas');
    expect(screen.getByRole('link', { name: 'Tech' })).toHaveAttribute('href', '/setup');
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

  it('links author credit to mzworthington.co.uk', () => {
    render(
      <DocsShell>
        <p>content</p>
      </DocsShell>
    );

    const credit = screen.getByRole('link', { name: 'Matthew Z Worthington' });
    expect(credit).toHaveAttribute('href', 'https://mzworthington.co.uk');
  });

  it('links Privacy policy to /privacy', () => {
    render(
      <DocsShell>
        <p>content</p>
      </DocsShell>
    );

    const privacy = screen.getByRole('link', { name: 'Privacy policy' });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(privacy.closest('nav')).toHaveAttribute('aria-label', 'Legal');
  });
});
