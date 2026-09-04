import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocsHome } from './DocsHome';
import { PRODUCT_HERO } from '../../content/productOutcomes';

vi.mock('wouter', () => ({
  useLocation: () => ['/'],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../components/AppHeader', () => ({
  AppHeader: ({ children, subtitle }: { children?: React.ReactNode; subtitle?: string }) => (
    <header>
      <span>{subtitle}</span>
      {children}
    </header>
  ),
}));

describe('DocsHome', () => {
  it('renders product suite and primary calls to action', () => {
    render(<DocsHome />);

    expect(screen.getByTestId('docs-home')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: PRODUCT_HERO.headline })).toBeInTheDocument();
    expect(screen.getByText('Open source')).toBeInTheDocument();
    expect(screen.getByText('Local first')).toBeInTheDocument();
    expect(screen.getByText(/uploaded to ArchLens servers/i)).toBeInTheDocument();
    expect(screen.getByText(/author locally, or publish the estate/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'On the diagram' })).toBeInTheDocument();
    expect(screen.getByText('Game day on the diagram')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /open archlens canvas/i }).length).toBeGreaterThan(
      0
    );
    expect(screen.getByRole('heading', { name: 'From repo to ranked list' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The tools' })).toBeInTheDocument();
    expect(screen.getByText('ArchLens Canvas')).toBeInTheDocument();
    expect(screen.getByText('ArchLens CLI')).toBeInTheDocument();
    expect(screen.getByText('ChaosLens')).toBeInTheDocument();
    expect(screen.getByText('BlueprintSpec')).toBeInTheDocument();
    expect(screen.getByText('ChaosSpec')).toBeInTheDocument();
    expect(screen.getByText('Observes')).toBeInTheDocument();
    expect(screen.getByText('Prescribes')).toBeInTheDocument();
    expect(screen.getByText('Resilience')).toBeInTheDocument();
  });

  it('uses landing layout without docs sidebar', () => {
    render(<DocsHome />);
    expect(screen.queryByTestId('docs-sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-mobile-start-nav')).not.toBeInTheDocument();
  });

  it('links each product card to its guide chapter', () => {
    render(<DocsHome />);

    expect(
      screen.getByRole('link', { name: 'ArchLens Canvas: Workspace over BlueprintSpec' })
    ).toHaveAttribute('href', '/guide/canvas');
    expect(
      screen.getByRole('link', { name: 'ArchLens CLI: Repo to BlueprintSpec' })
    ).toHaveAttribute('href', '/guide/cli');
    expect(
      screen.getByRole('link', { name: 'ChaosLens: What-if failures on the live diagram' })
    ).toHaveAttribute('href', '/guide/chaoslens');
  });
});
