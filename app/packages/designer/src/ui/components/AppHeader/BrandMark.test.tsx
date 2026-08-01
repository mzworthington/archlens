import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('renders forensics lens tabs instead of a single badge', () => {
    const { hook } = memoryLocation({ path: '/workspace?lens=tracelens' });
    render(
      <Router hook={hook}>
        <BrandMark
          lensTabs={[
            { label: 'TRACELENS', href: '/workspace?lens=tracelens', active: true },
            { label: 'ADVICELENS', href: '/workspace?lens=advicelens', active: false },
          ]}
        />
      </Router>
    );

    expect(screen.getByRole('link', { name: 'TRACELENS' })).toHaveAttribute(
      'href',
      '/workspace?lens=tracelens'
    );
    expect(screen.getByRole('link', { name: 'ADVICELENS' })).toHaveAttribute(
      'href',
      '/workspace?lens=advicelens'
    );
    expect(screen.queryByText('FORENSICS')).not.toBeInTheDocument();
  });
});
