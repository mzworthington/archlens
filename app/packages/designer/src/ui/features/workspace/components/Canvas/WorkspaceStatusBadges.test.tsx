import { render, screen } from '@testing-library/react';
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

  it('displays valid status badge when validation is successful', () => {
    render(<WorkspaceStatusBadges />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('displays cycle warning validation status badge when cycle is present', () => {
    useBlueprintStore.setState({
      validationResult: {
        isValid: false,
        issues: [{ type: 'cycle', message: 'Cycle detected', path: ['node1', 'node2'] }],
      },
    });

    render(<WorkspaceStatusBadges />);
    expect(screen.getByText('Cycle Detected')).toBeInTheDocument();
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
        migrationHint: 'Commit pending changes from the designer or re-run the CLI.',
      },
    });

    render(<WorkspaceStatusBadges />);
    expect(screen.getByTestId('schema-version-warning')).toHaveTextContent('Legacy schema format');
  });
});
