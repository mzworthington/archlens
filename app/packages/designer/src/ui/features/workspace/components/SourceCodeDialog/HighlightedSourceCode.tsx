import React, { useMemo } from 'react';
import { useHighlightedSource } from './useHighlightedSource';
import type { HighlightSpan } from '../../../../../application/parsing/treeSitterHighlight';

type HighlightedSourceCodeProps = {
  content: string;
  filepath?: string;
};

function renderSpans(spans: HighlightSpan[]): React.ReactNode {
  return spans.map((span, index) => {
    if (!span.className) {
      return <React.Fragment key={index}>{span.text}</React.Fragment>;
    }
    return (
      <span key={index} className={span.className}>
        {span.text}
      </span>
    );
  });
}

export const HighlightedSourceCode: React.FC<HighlightedSourceCodeProps> = ({
  content,
  filepath,
}) => {
  const { spans, loading, supported } = useHighlightedSource(content, filepath);
  const lineCount = useMemo(() => Math.max(1, content.split('\n').length), [content]);

  const body = !supported || !spans ? content : renderSpans(spans);

  return (
    <div
      className="flex-1 min-h-0 flex overflow-hidden rounded-xl border border-[#00f0ff]/10 bg-[#040914]/60"
      data-testid="source-code-content"
    >
      <div
        className="shrink-0 select-none border-r border-slate-800/80 bg-slate-950/40 px-3 py-4 text-right text-[10px] leading-relaxed text-slate-600 font-mono"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <div key={index + 1}>{index + 1}</div>
        ))}
      </div>

      <pre
        className="flex-1 min-h-0 overflow-auto overscroll-contain p-4 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre"
        tabIndex={0}
        aria-label="Source code content"
        data-highlighted={supported && spans ? 'true' : 'false'}
        data-highlight-loading={loading ? 'true' : 'false'}
      >
        <code>{body}</code>
      </pre>
    </div>
  );
};
