import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownView } from './MarkdownView';

describe('MarkdownView', () => {
  it('shows a failure when the markdown libraries do not load', async () => {
    render(
      <MarkdownView
        markdown="# Hi"
        fromDir="docs"
        loadLibs={() => Promise.reject(new Error('markdown module failed'))}
      />
    );
    expect(await screen.findByText('Markdown could not be loaded.')).toBeInTheDocument();
  });
});
