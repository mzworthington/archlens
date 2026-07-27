import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceStatusBadges } from './WorkspaceStatusBadges';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('WorkspaceStatusBadges', () => {
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
        loadedMajor: 2,
        expectedMajor: 4,
        loadedApiVersion: 'blueprint.dev/v2',
        expectedApiVersion: 'blueprint.dev/v4',
        title: 'Schema v2',
        message: 'This diagram targets apiVersion blueprint.dev/v2; Blueprint expects v4.',
        migrationHint: 'Re-run Blueprint CLI or commit pending changes from the designer.',
      },
    });

    render(<WorkspaceStatusBadges />);
    expect(screen.getByTestId('schema-version-warning')).toHaveTextContent('Schema v2');
  });
});
