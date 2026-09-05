import React, { useEffect, useId } from 'react';
import { Download, Folder, X } from 'lucide-react';
import { CollabDialogPortal } from '../CollabNameDialog/CollabDialogPortal';

export type SaveScanMapDialogProps = {
  isOpen: boolean;
  folderSaveAvailable: boolean;
  busy?: boolean;
  onSaveFolder: () => void;
  onDownload: () => void;
  onKeepInMemory: () => void;
};

export const SaveScanMapDialog: React.FC<SaveScanMapDialogProps> = ({
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
        data-testid="save-scan-map-dialog"
      >
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm" />

        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 id={titleId} className="text-base font-bold text-white">
                Save map to folder
              </h2>
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
                The scan is on the canvas. Save Blueprint YAML into a folder so later edits can
                draft and commit, download copies, or keep working in memory.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy || !folderSaveAvailable}
                  onClick={onSaveFolder}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-slate-600 disabled:opacity-40 cursor-pointer"
                >
                  <Folder className="w-4 h-4" aria-hidden="true" />
                  Save map to folder
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDownload}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Download YAML
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onKeepInMemory}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm font-semibold text-amber-100 hover:border-amber-800 disabled:opacity-40 cursor-pointer"
                >
                  Keep in memory
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CollabDialogPortal>
  );
};
