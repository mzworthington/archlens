import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceCodeDialog } from './SourceCodeDialog';

vi.mock('./useSourceCodeDialog', () => ({
  useSourceCodeDialog: vi.fn(),
}));

vi.mock('./HighlightedSourceCode', () => ({
  HighlightedSourceCode: ({ content }: { content: string }) => (
    <pre data-testid="source-code-content">
      <code>{content}</code>
    </pre>
  ),
}));

import { useSourceCodeDialog } from './useSourceCodeDialog';

const mockedHook = vi.mocked(useSourceCodeDialog);

describe('SourceCodeDialog', () => {
  beforeEach(() => {
    mockedHook.mockReturnValue({
      result: {
        ok: true,
        content: 'export const answer = 42;',
        origin: 'remote',
        filepath: 'src/answer.ts',
        viewerUrl: 'https://github.com/org/repo/blob/abc/src/answer.ts',
        rawUrl: 'https://raw.githubusercontent.com/org/repo/abc/src/answer.ts',
      },
      loading: false,
      reload: vi.fn(),
    });
  });

  it('renders nothing when closed', () => {
    render(
      <SourceCodeDialog
        isOpen={false}
        onClose={() => {}}
        filepath="src/answer.ts"
        isWorkspaceOpen={false}
      />
    );
    expect(screen.queryByTestId('source-code-dialog')).not.toBeInTheDocument();
  });

  it('shows loaded source content when open', async () => {
    render(
      <SourceCodeDialog
        isOpen
        onClose={() => {}}
        filepath="src/answer.ts"
        isWorkspaceOpen={false}
        source={{
          remoteUrl: 'https://github.com/org/repo',
          scannedAtCommit: 'abc',
        }}
      />
    );

    expect(screen.getByTestId('source-code-dialog')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('source-code-content')).toHaveTextContent(
        'export const answer = 42;'
      );
    });
    expect(screen.getByLabelText('Open in repository browser')).toHaveAttribute(
      'href',
      'https://github.com/org/repo/blob/abc/src/answer.ts'
    );
  });

  it('shows scan system name when present on provenance', () => {
    render(
      <SourceCodeDialog
        isOpen
        onClose={() => {}}
        filepath="src/answer.ts"
        isWorkspaceOpen={false}
        source={{
          remoteUrl: 'https://github.com/org/repo',
          scannedAtCommit: 'abc',
          systemName: 'frontend-api',
        }}
      />
    );

    expect(screen.getByText('System · frontend-api')).toBeInTheDocument();
  });

  it('renders informative helper card when source preview is unavailable', () => {
    mockedHook.mockReturnValue({
      result: {
        ok: false,
        error: 'HTTP 404',
        viewerUrl: 'https://github.com/org/repo/blob/abc/src/answer.ts',
      },
      loading: false,
      reload: vi.fn(),
    });

    render(
      <SourceCodeDialog
        isOpen
        onClose={() => {}}
        filepath="src/answer.ts"
        isWorkspaceOpen={false}
      />
    );

    expect(screen.getByText('Source code preview unavailable')).toBeInTheDocument();
    expect(screen.getByText(/public repositories/i)).toBeInTheDocument();
    expect(screen.getByText('Tips for private repos:')).toBeInTheDocument();
  });
});
