import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocsPage } from './DocsPage';
import { TRACELENS_POSTER_SRC } from './tracelensDemo';

const { setLocation } = vi.hoisted(() => ({ setLocation: vi.fn() }));

vi.mock('wouter', () => ({
  useLocation: () => ['/guide/tracelens', setLocation],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function staticArticle(): HTMLElement {
  const article = document.querySelector('.docs-prose-static');
  expect(article).toBeInstanceOf(HTMLElement);
  expect(article?.textContent).toMatch(/TraceLens attaches git signals/i);
  return article as HTMLElement;
}

describe('TraceLens guide article', () => {
  it('shows the sized still on first paint and loads the GIF only when played', () => {
    render(<DocsPage />);

    expect(screen.queryByText('Loading markdown…')).not.toBeInTheDocument();
    const prose = within(staticArticle());
    const still = prose.getByRole('img', { name: 'TraceLens ranked offenders' });
    expect(still).toHaveAttribute('src', TRACELENS_POSTER_SRC);
    expect(still).toHaveAttribute('width', '1280');
    expect(still).toHaveAttribute('height', '828');
    for (const link of prose.getAllByRole('link', { name: 'AdviceLens' })) {
      expect(link).toHaveAttribute('href', '/guide/advicelens');
    }

    fireEvent.click(screen.getByRole('button', { name: 'Play TraceLens demo' }));

    const playing = screen.getByRole('img', { name: 'TraceLens ranked offenders' });
    expect(playing.getAttribute('src')).toContain('tracelens.gif');
    expect(screen.queryByRole('button', { name: 'Play TraceLens demo' })).not.toBeInTheDocument();
  });

  it('routes in-guide links without a document load', () => {
    render(<DocsPage />);
    fireEvent.click(within(staticArticle()).getAllByRole('link', { name: 'ChaosLens' })[0]);
    expect(setLocation).toHaveBeenCalledWith('/guide/chaoslens');
  });
});
