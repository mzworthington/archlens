import React from 'react';
import { Panel } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';

type SchemaImportErrorBannerProps = {
  error: string | null;
  onDismiss: () => void;
};

export const SchemaImportErrorBanner: React.FC<SchemaImportErrorBannerProps> = ({
  error,
  onDismiss,
}) => {
  if (!error) return null;

  return (
    <Panel position="top-center" className="m-4 max-w-md w-full animate-bounce-short">
      <div className="flex items-start gap-3 bg-red-950/90 border border-red-900/50 px-4 py-3 rounded-xl shadow-2xl shadow-red-950/40 backdrop-blur-md text-red-200 text-xs">
        <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
        <div className="flex-1">
          <h5 className="font-bold text-red-300 mb-0.5">Schema Import Failed</h5>
          <p className="leading-relaxed whitespace-pre-wrap">{error}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-200 transition text-[10px] font-bold uppercase tracking-wider ml-2 shrink-0 self-center border border-red-900/40 hover:border-red-900/80 rounded px-1.5 py-0.5 bg-red-950/60"
        >
          Dismiss
        </button>
      </div>
    </Panel>
  );
};
