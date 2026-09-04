import React from 'react';
import { Loader2 } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { BrowserLiteScanProgress } from '../../../../components/BrowserLiteScanProgress/BrowserLiteScanProgress';

export const DiagramLoadingOverlay: React.FC = () => {
  const isLoading = useBlueprintStore(state => state.isLoading);
  const liteScanProgress = useBlueprintStore(state => state.liteScanProgress);
  const cancelBrowserLiteScan = useBlueprintStore(state => state.cancelBrowserLiteScan);
  if (!isLoading) return null;

  return (
    <div
      className="absolute inset-0 bg-bp-canvas/65 backdrop-blur-[4px] z-50 flex flex-col items-center justify-center gap-3 animate-fade-in pointer-events-auto"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="diagram-loading-overlay"
    >
      <div className="p-4 rounded-2xl bg-[#061125]/85 border border-[#00f0ff]/20 shadow-[0_0_30px_rgba(0,240,255,0.15)] flex flex-col items-center gap-3 min-w-[180px] max-w-[280px] text-center">
        {liteScanProgress ? (
          <BrowserLiteScanProgress progress={liteScanProgress} onCancel={cancelBrowserLiteScan} />
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-[#00f0ff]" aria-hidden />
            <span className="text-xs font-mono tracking-wider text-slate-350 uppercase">
              {typeof isLoading === 'string' ? isLoading : 'Loading diagram...'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
