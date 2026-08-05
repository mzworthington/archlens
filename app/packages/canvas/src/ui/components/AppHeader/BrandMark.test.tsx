import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('renders a single active lens badge', () => {
    render(<BrandMark badge="TRACELENS" />);

    expect(screen.getByText('TRACELENS')).toBeInTheDocument();
    expect(screen.queryByText('ADVICELENS')).not.toBeInTheDocument();
    expect(screen.queryByText('FORENSICS')).not.toBeInTheDocument();
  });
});
