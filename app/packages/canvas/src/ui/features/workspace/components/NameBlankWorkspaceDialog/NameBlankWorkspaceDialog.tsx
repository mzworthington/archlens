import React, { useEffect, useId, useState } from 'react';
import { Folder, Layers, X } from 'lucide-react';
import { CollabDialogPortal } from '../CollabNameDialog/CollabDialogPortal';
import {
  canContinueUnsaved,
  DEFAULT_BLANK_WORKSPACE_NAME,
  resolveBlankWorkspaceName,
} from '../../../../../application/store/states/ioState/blankWorkspacePlacement';

export type NameBlankWorkspaceDialogProps = {
  isOpen: boolean;
  initialName?: string;
  folderSaveAvailable: boolean;
  busy?: boolean;
  onSaveFile: (name: string) => void;
  onSaveFolder: (name: string) => void;
  onContinueUnsaved: (name: string) => void;
  onCancel: () => void;
};

export const NameBlankWorkspaceDialog: React.FC<NameBlankWorkspaceDialogProps> = ({
  isOpen,
  initialName = DEFAULT_BLANK_WORKSPACE_NAME,
  folderSaveAvailable,
  busy = false,
  onSaveFile,
  onSaveFolder,
  onContinueUnsaved,
  onCancel,
}) => {
  const titleId = useId();
  const nameId = useId();
  const riskId = useId();
  const [draft, setDraft] = useState(initialName);
  const [acknowledgedRisk, setAcknowledgedRisk] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(initialName);
    setAcknowledgedRisk(false);
  }, [isOpen, initialName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, isOpen, onCancel]);

  if (!isOpen) return null;

  const name = resolveBlankWorkspaceName(draft, initialName);

  return (
    <CollabDialogPortal>
      <div
        className="fixed inset-0 z-[200]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="name-blank-workspace-dialog"
      >
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm" />

        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
          <form
            className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl"
            onSubmit={event => {
              event.preventDefault();
              onSaveFile(name);
            }}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-300" aria-hidden="true" />
                <h2 id={titleId} className="text-base font-bold text-white">
                  Name this workspace
                </h2>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer disabled:opacity-40"
                aria-label="Cancel naming workspace"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-400 leading-relaxed">
                Give the diagram a name and choose a file, a folder, or continue unsaved. Unsaved
                work can disappear on refresh.
              </p>
              <div>
                <label htmlFor={nameId} className="block text-xs font-semibold text-slate-300 mb-1">
                  Workspace name
                </label>
                <input
                  id={nameId}
                  type="text"
                  value={draft}
                  autoFocus
                  disabled={busy}
                  onChange={event => setDraft(event.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-500/40 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-slate-600 disabled:opacity-40 cursor-pointer"
                >
                  Save as a file
                </button>
                <button
                  type="button"
                  disabled={busy || !folderSaveAvailable}
                  onClick={() => onSaveFolder(name)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <Folder className="w-4 h-4" aria-hidden="true" />
                  Save in a folder
                </button>
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={acknowledgedRisk}
                  disabled={busy}
                  aria-describedby={riskId}
                  onChange={event => setAcknowledgedRisk(event.target.checked)}
                />
                <span id={riskId}>
                  Continue unsaved. I know this diagram is only in this browser until I save.
                </span>
              </label>
              <button
                type="button"
                disabled={busy || !canContinueUnsaved(acknowledgedRisk)}
                onClick={() => onContinueUnsaved(name)}
                className="w-full inline-flex min-h-11 items-center justify-center rounded-md border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm font-semibold text-amber-100 hover:border-amber-800 disabled:opacity-40 cursor-pointer"
              >
                Continue unsaved
              </button>
            </div>
          </form>
        </div>
      </div>
    </CollabDialogPortal>
  );
};
