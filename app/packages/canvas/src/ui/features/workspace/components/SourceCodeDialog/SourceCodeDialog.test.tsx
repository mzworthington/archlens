import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    localStorage.clear();
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
    expect(
      screen.getAllByRole('link', { name: /Open in repository browser/i }).length
    ).toBeGreaterThan(0);
  });

  it('allows user to save PAT token for private repository access', async () => {
    const onSavePat = vi.fn();
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
        onSavePat={onSavePat}
      />
    );

    const patBtn = screen.getByRole('button', { name: /Add PAT/i });
    fireEvent.click(patBtn);

    const input = screen.getByPlaceholderText('ghp_... or github_pat_...');
    expect(input).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save & Retry/i });
    expect(saveBtn).toBeInTheDocument();
  });

  it('does not use a javascript: custom repo URL as a link href', () => {
    mockedHook.mockReturnValue({
      result: { ok: false, error: 'No remote' },
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

    fireEvent.change(screen.getByPlaceholderText('https://github.com/owner/repo'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save & View Link/i }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('builds an https viewer link from a custom GitHub repo URL', () => {
    mockedHook.mockReturnValue({
      result: { ok: false, error: 'No remote' },
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

    fireEvent.change(screen.getByPlaceholderText('https://github.com/owner/repo'), {
      target: { value: 'https://github.com/owner/repo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save & View Link/i }));

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', 'https://github.com/owner/repo/blob/main/src/answer.ts');
    }
  });

  it('ignores javascript: viewer URLs returned by the loader', () => {
    mockedHook.mockReturnValue({
      result: {
        ok: false,
        error: 'HTTP 404',
        viewerUrl: 'javascript:alert(1)',
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

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
