import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSourceCodeDialog } from './useSourceCodeDialog';
import type { SourceFileLoadResult } from '../../../../../application/source/fetchSourceFileContent';

vi.mock('../../../../../application/source/fetchSourceFileContent', () => ({
  fetchSourceFileContent: vi.fn(),
}));

import { fetchSourceFileContent } from '../../../../../application/source/fetchSourceFileContent';

const mockedFetch = vi.mocked(fetchSourceFileContent);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useSourceCodeDialog', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('loads source content when the dialog opens', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      content: 'export const answer = 42;',
      origin: 'remote',
      filepath: 'src/answer.ts',
    });

    const { result } = renderHook(() =>
      useSourceCodeDialog({
        isOpen: true,
        filepath: 'src/answer.ts',
        isWorkspaceOpen: false,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.result).toEqual({
      ok: true,
      content: 'export const answer = 42;',
      origin: 'remote',
      filepath: 'src/answer.ts',
    });
  });

  it('does not update state after unmount while a source fetch is in flight', async () => {
    const pending = deferred<SourceFileLoadResult>();
    mockedFetch.mockReturnValue(pending.promise);

    const { result, unmount } = renderHook(() =>
      useSourceCodeDialog({
        isOpen: true,
        filepath: 'src/answer.ts',
        isWorkspaceOpen: false,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    unmount();

    await act(async () => {
      pending.resolve({
        ok: true,
        content: 'too late',
        origin: 'remote',
        filepath: 'src/answer.ts',
      });
      await pending.promise;
    });
  });
});
