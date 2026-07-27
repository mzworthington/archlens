import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocsHome } from './DocsHome';

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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Architecture your teams can design, validate, and trust'
    );
    expect(screen.getAllByRole('link', { name: /open blueprint canvas/i }).length).toBeGreaterThan(
      0
    );
    expect(screen.getByRole('heading', { name: 'How teams use Blueprint' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Product suite' })).toBeInTheDocument();
    expect(screen.getByText('Blueprint canvas')).toBeInTheDocument();
    expect(screen.getByText('ChaosLens')).toBeInTheDocument();
    expect(screen.getByText('BlueprintSpec')).toBeInTheDocument();
  });

  it('uses landing layout without docs sidebar', () => {
    render(<DocsHome />);
    expect(screen.queryByTestId('docs-sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('docs-mobile-guide-nav')).not.toBeInTheDocument();
  });

  it('links each product card to its guide chapter', () => {
    render(<DocsHome />);

    expect(
      screen.getByRole('link', { name: 'Blueprint canvas: Visual architecture studio' })
    ).toHaveAttribute('href', '/guide/canvas');
    expect(screen.getByRole('link', { name: 'ChaosLens: Resilience simulation' })).toHaveAttribute(
      'href',
      '/guide/chaoslens'
    );
  });
});
