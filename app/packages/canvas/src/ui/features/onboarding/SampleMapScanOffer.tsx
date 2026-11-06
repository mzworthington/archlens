import React from 'react';
import { Panel } from '@xyflow/react';
import { ScanSearch } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../application/store/store';
import { isBrowserDirectoryPickerSupported } from '../../../infrastructure/analysis/browserSourceWalker';
import { navigateToActiveWorkspaceEntity } from '../workspace/hooks/navigateToActiveWorkspaceEntity';
import { useActiveDiagramEntity } from '../workspace/hooks/useActiveDiagramEntity';
import { shouldOfferSampleMapScan } from './shouldOfferSampleMapScan';

const ZIP_ACCEPT = '.zip,application/zip,application/x-zip-compressed';

export const SampleMapScanOffer: React.FC = () => {
  const [, setLocation] = useLocation();
  const isSampleWorkspace = useBlueprintStore(state => state.isSampleWorkspace);
  const isResilienceMode = useBlueprintStore(state => state.isResilienceMode);
  const openBrowserLiteScan = useBlueprintStore(state => state.openBrowserLiteScan);
  const { activeEntityRef } = useActiveDiagramEntity();
  const zipInputRef = React.useRef<HTMLInputElement>(null);

  if (
    !shouldOfferSampleMapScan({
      isSampleWorkspace,
      activeEntityRef,
      isResilienceMode,
    })
  ) {
    return null;
  }

  const directoryPickerSupported = isBrowserDirectoryPickerSupported();

  const runScan = (source?: { zipFile: File }) => {
    const pending = source ? openBrowserLiteScan(source) : openBrowserLiteScan();
    void pending.then(opened => {
      if (opened) navigateToActiveWorkspaceEntity(setLocation);
    });
  };

  const handleFolderScan = () => {
    if (!directoryPickerSupported) {
      zipInputRef.current?.click();
      return;
    }
    runScan();
  };

  return (
    <Panel
      position="bottom-center"
      className="z-40 !mb-52 w-[min(42rem,calc(100%-1.5rem))] pointer-events-auto sm:!mb-28"
    >
      <div
        className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-navy/95 px-4 py-3 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center"
        data-testid="sample-map-scan-offer"
      >
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-200">
          Scan your own repo from this map. The sample stays until you choose a folder or a ZIP.
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleFolderScan}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:border-accent/50 cursor-pointer"
            data-testid="sample-map-scan-folder"
          >
            <ScanSearch className="h-4 w-4" aria-hidden />
            Scan your repo
          </button>
          <button
            type="button"
            onClick={() => zipInputRef.current?.click()}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 cursor-pointer"
            data-testid="sample-map-scan-zip"
          >
            Upload a ZIP to scan
          </button>
        </div>
        <input
          ref={zipInputRef}
          type="file"
          accept={ZIP_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          data-testid="sample-map-scan-zip-input"
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            runScan({ zipFile: file });
          }}
        />
      </div>
    </Panel>
  );
};
