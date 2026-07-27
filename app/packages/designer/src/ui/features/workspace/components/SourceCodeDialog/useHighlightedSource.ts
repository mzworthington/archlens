import { useEffect, useState } from 'react';
import { extensionToTreeSitterLanguage } from '@blueprint/core';
import type { HighlightSpan } from '../../../../../application/parsing/treeSitterHighlight';

export type UseHighlightedSourceResult = {
  spans: HighlightSpan[] | null;
  loading: boolean;
  supported: boolean;
};

export function useHighlightedSource(
  content: string,
  filepath: string | undefined
): UseHighlightedSourceResult {
  const supported = filepath ? extensionToTreeSitterLanguage(filepath) !== null : false;
  const [spans, setSpans] = useState<HighlightSpan[] | null>(null);
  const [loading, setLoading] = useState(supported);

  useEffect(() => {
    if (!filepath || !supported) {
      setSpans(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void import('../../../../../application/parsing/treeSitterHighlight')
      .then(({ highlightSourceFile }) => highlightSourceFile(content, filepath))
      .then(next => {
        if (!cancelled) {
          setSpans(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpans(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [content, filepath, supported]);

  return { spans, loading, supported };
}
