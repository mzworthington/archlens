import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { Header } from './Header';
import { useBlueprintStore } from '../../../../../application/store/store';

function renderHeader() {
  const { hook } = memoryLocation({ path: '/workspace' });
  return render(
    <Router hook={hook}>
      <Header />
    </Router>
  );
}

describe('Header Component', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    });
    useBlueprintStore.setState({
      workspaceName: '',
      isWorkspaceOpen: false,
      validationResult: { isValid: true, issues: [] },
    });
  });

  it('renders branding and breadcrumbs', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /ARCHLENS/i })).toBeInTheDocument();
  });
});
