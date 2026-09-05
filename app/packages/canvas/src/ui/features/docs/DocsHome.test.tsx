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
    expect(screen.getAllByText(/uploaded to ArchLens servers/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'What do I do today?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'On the diagram' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'ChaosLens' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /open archlens canvas/i }).length).toBeGreaterThan(
      0
    );
    expect(
      screen.getByRole('heading', { name: 'CLI, Canvas, then the lenses' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The tools' })).toHaveClass('text-slate-400');
    expect(
      screen.getByText('Canvas and the CLI. TraceLens, ChaosLens and AdviceLens on the same map.')
    ).toHaveClass('text-slate-300');
    expect(screen.getByText('ArchLens Canvas')).toBeInTheDocument();
    expect(screen.getByText('ArchLens CLI')).toBeInTheDocument();
    expect(screen.getAllByText('ChaosLens').length).toBeGreaterThan(0);
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
      screen.getByRole('link', { name: 'ArchLens Canvas: The map you work on' })
    ).toHaveAttribute('href', '/guide/canvas');
    expect(screen.getByRole('link', { name: 'ArchLens CLI: Scan the repo' })).toHaveAttribute(
      'href',
      '/guide/cli'
    );
    expect(
      screen.getByRole('link', { name: 'ChaosLens: Break a service on the map' })
    ).toHaveAttribute('href', '/guide/chaoslens');
  });
});
