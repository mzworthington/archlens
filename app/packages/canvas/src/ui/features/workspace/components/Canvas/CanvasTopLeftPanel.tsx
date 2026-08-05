import React from 'react';
import { Panel } from '@xyflow/react';
import { ZoomOut } from 'lucide-react';
import { WorkspaceStatusBadges } from './WorkspaceStatusBadges';

type CanvasTopLeftPanelProps = {
  parentEntityRef: string | null | undefined;
  onZoomOut: () => void;
};

export const CanvasTopLeftPanel: React.FC<CanvasTopLeftPanelProps> = ({
  parentEntityRef,
  onZoomOut,
}) => (
  <Panel position="top-left" className="m-4 flex flex-col items-start gap-2">
    <WorkspaceStatusBadges />
    {parentEntityRef ? (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onZoomOut();
        }}
        className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 hover:border-brand-500/40 hover:bg-slate-900 text-slate-200 hover:text-brand-300 px-3 py-1.5 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md text-xs font-semibold transition cursor-pointer"
        title="Zoom out to parent diagram (Esc)"
        data-testid="zoom-out-button"
      >
        <ZoomOut className="w-3.5 h-3.5" />
        <span>Zoom out</span>
        <kbd className="hidden sm:inline ml-1 text-[9px] font-mono text-slate-300 bg-slate-900 border border-slate-700 rounded px-1 py-0.5">
          Esc
        </kbd>
      </button>
    ) : null}
  </Panel>
);
