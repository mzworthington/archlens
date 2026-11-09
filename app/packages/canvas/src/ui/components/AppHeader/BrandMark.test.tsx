import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('links the product mark to the guide', () => {
    render(<BrandMark />);

    expect(screen.getByRole('link', { name: /ARCHLENS/ })).toHaveAttribute('href', '/guide');
  });

  it('renders a single active lens badge', () => {
    render(<BrandMark badge="TRACELENS" />);

    expect(screen.getByText('TRACELENS')).toBeInTheDocument();
    expect(screen.queryByText('ADVICELENS')).not.toBeInTheDocument();
    expect(screen.queryByText('FORENSICS')).not.toBeInTheDocument();
  });
});
