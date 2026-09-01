import { useCallback, useEffect, useState } from 'react';
import type { SourceProvenance } from '@archlens/core';
import {
  fetchSourceFileContent,
  type SourceFileLoadResult,
} from '../../../../../application/source/fetchSourceFileContent';

export type UseSourceCodeDialogArgs = {
  isOpen: boolean;
  filepath?: string;
  source?: SourceProvenance;
  isWorkspaceOpen: boolean;
  readLocalFile?: (relativePath: string) => Promise<string>;
  githubPat?: string | null;
};

export function useSourceCodeDialog({
  isOpen,
  filepath,
  source,
  isWorkspaceOpen,
  readLocalFile,
  githubPat,
}: UseSourceCodeDialogArgs) {
  const [result, setResult] = useState<SourceFileLoadResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!filepath) {
        if (!isCancelled()) {
          setResult({ ok: false, error: 'This node has no filepath.' });
        }
        return;
      }

      if (!isCancelled()) setLoading(true);
      try {
        const next = await fetchSourceFileContent(source, filepath, {
          readLocalFile: isWorkspaceOpen ? readLocalFile : undefined,
          githubPat: githubPat ?? undefined,
        });
        if (!isCancelled()) setResult(next);
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [filepath, source, isWorkspaceOpen, readLocalFile, githubPat]
  );

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [isOpen, load]);

  return {
    result,
    loading,
    reload: load,
  };
}
