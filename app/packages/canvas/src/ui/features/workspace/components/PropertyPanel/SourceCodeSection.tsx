import React from 'react';
import { Code2, ExternalLink } from 'lucide-react';
import { buildSourceFileUrl, type SourceProvenance } from '@archlens/core';
import { useBlueprintStore } from '../../../../../application/store/store';

interface SourceCodeSectionProps {
  filepath?: string;
  source?: SourceProvenance;
}

export const SourceCodeSection: React.FC<SourceCodeSectionProps> = ({ filepath, source }) => {
  const openSourceCodeDialog = useBlueprintStore(state => state.openSourceCodeDialog);
  if (!filepath) return null;

  const viewerUrl = source ? buildSourceFileUrl(source, filepath) : undefined;

  return (
    <div className="border-t border-slate-900 pt-4" data-testid="source-code-property-section">
      <h4 className="text-[10px] font-bold font-mono text-[#00f0ff] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Code2 className="w-3.5 h-3.5" />
        <span>Source Code</span>
      </h4>

      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <p className="text-xs font-mono text-slate-300 break-all">{filepath}</p>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-900/80">
          <button
            type="button"
            onClick={() => openSourceCodeDialog(filepath, source)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/25 text-xs font-semibold transition cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>View Code</span>
          </button>

          {viewerUrl ? (
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 text-xs font-semibold transition cursor-pointer"
              title="Open directly in repository browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};
