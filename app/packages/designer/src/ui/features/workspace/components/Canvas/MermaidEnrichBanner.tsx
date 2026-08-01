import React from 'react';
import { Panel } from '@xyflow/react';
import { AlertTriangle, X } from 'lucide-react';

type MermaidEnrichBannerProps = {
  open: boolean;
  onDismiss: () => void;
};

export const MermaidEnrichBanner: React.FC<MermaidEnrichBannerProps> = ({ open, onDismiss }) => {
  if (!open) return null;

  return (
    <Panel position="top-center" className="m-4 max-w-lg w-full z-50">
      <div
        className="flex items-start gap-3 border border-amber-500/30 bg-amber-950/90 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-amber-100 text-xs"
        data-testid="mermaid-enrich-banner"
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <h5 className="font-bold text-amber-200">Mermaid import is lossy</h5>
          <p className="leading-relaxed text-amber-100/90">
            Forensics and nested subgraphs are not preserved. Re-run an ArchLens scan to enrich YAML
            with git metrics and coupling data.
          </p>
          <a
            href="/guide/cli"
            className="inline-flex text-[10px] font-mono font-semibold text-[#00f0ff] hover:underline"
          >
            See CLI scan guide
          </a>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-300 hover:text-amber-100 transition shrink-0 p-0.5 rounded hover:bg-white/10"
          aria-label="Dismiss enrich banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Panel>
  );
};
