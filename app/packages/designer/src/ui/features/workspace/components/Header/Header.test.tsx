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
      apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
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
    expect(screen.getByRole('link', { name: /BLUEPRINT/i })).toBeInTheDocument();
  });
});
