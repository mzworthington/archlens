import React, { useEffect, useId } from 'react';
import { Download, Folder, ScanSearch, X } from 'lucide-react';
import { CollabDialogPortal } from '../CollabNameDialog/CollabDialogPortal';

export type SaveBrowserLiteScanDialogProps = {
  isOpen: boolean;
  folderSaveAvailable: boolean;
  busy?: boolean;
  onSaveFolder: () => void;
  onDownload: () => void;
  onKeepInMemory: () => void;
};

export const SaveBrowserLiteScanDialog: React.FC<SaveBrowserLiteScanDialogProps> = ({
  isOpen,
  folderSaveAvailable,
  busy = false,
  onSaveFolder,
  onDownload,
  onKeepInMemory,
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onKeepInMemory();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, isOpen, onKeepInMemory]);

  if (!isOpen) return null;

  return (
    <CollabDialogPortal>
      <div
        className="fixed inset-0 z-[200]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="save-browser-lite-scan-dialog"
      >
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm" />

        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanSearch className="w-4 h-4 text-amber-300" aria-hidden="true" />
                <h2 id={titleId} className="text-base font-bold text-white">
                  Save map to folder?
                </h2>
              </div>
              <button
                type="button"
                onClick={onKeepInMemory}
                disabled={busy}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer disabled:opacity-40"
                aria-label="Keep map in memory"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-400 leading-relaxed">
                The scan map is in memory. Save Blueprint YAML into a blueprints folder so later
                edits use draft/commit, download a copy, or keep working without writing disk.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  name="save-map-to-folder"
                  disabled={busy || !folderSaveAvailable}
                  onClick={onSaveFolder}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-slate-600 disabled:opacity-40 cursor-pointer"
                >
                  <Folder className="w-4 h-4" aria-hidden="true" />
                  Save to folder
                </button>
                <button
                  type="button"
                  name="download-scan-yaml"
                  disabled={busy}
                  onClick={onDownload}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Download YAML
                </button>
                <button
                  type="button"
                  name="keep-scan-in-memory"
                  disabled={busy}
                  onClick={onKeepInMemory}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm font-semibold text-amber-100 hover:border-amber-800 disabled:opacity-40 cursor-pointer"
                >
                  Keep in memory
                </button>
              </div>
              {!folderSaveAvailable ? (
                <p className="text-xs text-slate-500">
                  This browser cannot pick a writable folder. Download YAML instead, or use Chrome
                  or Edge.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </CollabDialogPortal>
  );
};
