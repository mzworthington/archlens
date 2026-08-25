import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceStatusBadges } from './WorkspaceStatusBadges';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('WorkspaceStatusBadges', () => {
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
      validationResult: { isValid: true, issues: [] },
      schemaVersionWarning: null,
      isBrowserLiteWorkspace: false,
    });
  });

  it('displays the C4 level badge', () => {
    const { schema } = useBlueprintStore.getState();
    useBlueprintStore.setState({
      schema: { ...schema, level: 'component' },
    });

    render(<WorkspaceStatusBadges />);
    expect(screen.getByText('component')).toBeInTheDocument();
  });

  it('displays a lite-scan badge when the workspace came from a browser scan', () => {
    useBlueprintStore.setState({ isBrowserLiteWorkspace: true });

    render(<WorkspaceStatusBadges />);
    expect(screen.getByTestId('browser-lite-workspace-badge')).toHaveTextContent(/Lite scan/i);
  });

  it('displays valid status badge when validation is successful', () => {
    render(<WorkspaceStatusBadges />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('displays cycle warning validation status badge when cycle is present and opens modal on click', () => {
    useBlueprintStore.setState({
      validationResult: {
        isValid: false,
        issues: [{ type: 'cycle', message: 'Cycle detected', path: ['node1', 'node2'] }],
      },
      isValidationOpen: false,
    });

    render(<WorkspaceStatusBadges />);
    const badge = screen.getByTestId('validation-status-badge');
    expect(badge).toHaveTextContent('Cycle Detected');

    fireEvent.click(badge);
    expect(useBlueprintStore.getState().isValidationOpen).toBe(true);
  });

  it('displays schema version warning badge when loaded version mismatches app expectation', () => {
    useBlueprintStore.setState({
      schemaVersionWarning: {
        status: 'legacy',
        loadedMajor: null,
        expectedMajor: 4,
        loadedVersion: '1.0.0',
        expectedVersionUrl: 'https://archlens.dev/schemas/v4/blueprint.schema.json',
        title: 'Legacy schema format',
        message: 'This diagram uses a legacy schema version (1.0.0). ArchLens expects v4.',
        migrationHint: 'Commit pending changes from ArchLens Canvas or re-run the CLI.',
      },
    });

    render(<WorkspaceStatusBadges />);
    expect(screen.getByTestId('schema-version-warning')).toHaveTextContent('Legacy schema format');
  });
});
