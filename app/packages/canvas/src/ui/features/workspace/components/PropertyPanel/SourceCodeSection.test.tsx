import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SourceCodeSection } from './SourceCodeSection';
import type { SourceProvenance } from '@archlens/core';

describe('SourceCodeSection', () => {
  const source: SourceProvenance = {
    remoteUrl: 'https://github.com/org/repo',
    scannedAtCommit: 'main',
  };

  it('renders null when no filepath is provided', () => {
    const { container } = render(<SourceCodeSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders source code section with direct link when filepath and source are provided', () => {
    render(<SourceCodeSection filepath="src/services/api.ts" source={source} />);

    expect(screen.getByTestId('source-code-property-section')).toBeInTheDocument();
    expect(screen.getByText('src/services/api.ts')).toBeInTheDocument();
    expect(screen.getByText('View Code')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute(
      'href',
      'https://github.com/org/repo/blob/main/src/services/api.ts'
    );
  });
});
