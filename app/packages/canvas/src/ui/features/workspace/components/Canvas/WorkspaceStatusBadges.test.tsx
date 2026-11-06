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
      isValidationOpen: false,
    });
  });

  it('displays the C4 level badge', () => {
    const { schema } = useBlueprintStore.getState();
    useBlueprintStore.setState({
      schema: { ...schema, level: 'component' },
    });

    render(<WorkspaceStatusBadges />);
    const level = screen.getByTestId('schema-level-badge');
    expect(level).toHaveTextContent('component');
    expect(level).toHaveClass('canvas-status-chip');
    expect(level).toHaveAttribute('data-status-tone', 'level');
  });

  it('displays a lite-scan badge when the workspace came from a browser scan', () => {
    useBlueprintStore.setState({ isBrowserLiteWorkspace: true });

    render(<WorkspaceStatusBadges />);
    const badge = screen.getByTestId('browser-lite-workspace-badge');
    expect(badge).toHaveTextContent(/Lite scan/i);
    expect(badge).toHaveAttribute('data-status-tone', 'warn');
  });

  it('displays valid status badge when validation is successful', () => {
    render(<WorkspaceStatusBadges />);
    const badge = screen.getByTestId('validation-status-badge');
    expect(badge).toHaveTextContent('Valid');
    expect(badge).toHaveClass('canvas-status-chip');
    expect(badge).toHaveAttribute('data-status-tone', 'ok');
  });

  it('does not open the validation dialog from the valid status chip', () => {
    render(<WorkspaceStatusBadges />);
    fireEvent.click(screen.getByTestId('validation-status-badge'));
    expect(useBlueprintStore.getState().isValidationOpen).toBe(false);
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
    expect(badge).toHaveAttribute('data-status-tone', 'alert');

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
    const badge = screen.getByTestId('schema-version-warning');
    expect(badge).toHaveTextContent('Legacy schema format');
    expect(badge).toHaveAttribute('data-status-tone', 'warn');
  });
});
