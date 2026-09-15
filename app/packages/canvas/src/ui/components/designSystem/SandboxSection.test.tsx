import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SandboxSection } from './SandboxSection';

describe('SandboxSection', () => {
  it('renders the YAML preview label once', () => {
    render(
      <SandboxSection
        sandboxNodeType="software-system"
        setSandboxNodeType={vi.fn()}
        sandboxTitle="Payments"
        setSandboxTitle={vi.fn()}
        sandboxDesc="ledger"
        setSandboxDesc={vi.fn()}
        sandboxStatus="healthy"
        setSandboxStatus={vi.fn()}
      />
    );
    expect(screen.getAllByText('// Serialized YAML Model Output:')).toHaveLength(1);
  });
});
