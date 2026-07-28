import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocsPage } from './DocsPage';

vi.mock('wouter', () => ({
  useLocation: () => ['/guide/canvas'],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('./MarkdownView', () => ({
  MarkdownView: () => <div data-testid="docs-markdown" />,
}));

describe('DocsPage product CTA', () => {
  it('shows an in-app product button on product guide pages', () => {
    render(<DocsPage />);

    const cta = screen.getByTestId('docs-product-cta');
    expect(cta).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open archlens canvas/i })).toHaveAttribute(
      'href',
      '/workspace'
    );
  });
});
