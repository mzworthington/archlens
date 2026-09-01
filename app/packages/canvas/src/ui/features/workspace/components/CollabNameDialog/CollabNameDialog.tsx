import React, { useEffect, useId, useState } from 'react';
import { Users, X } from 'lucide-react';
import { normalizeCollabDisplayName } from '../../../../../core';
import { CollabDialogPortal } from './CollabDialogPortal';

interface CollabNameDialogProps {
  isOpen: boolean;
  initialName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const CollabNameDialog: React.FC<CollabNameDialogProps> = ({
  isOpen,
  initialName = '',
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState(initialName);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(initialName);
    setShowError(false);
  }, [isOpen, initialName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const submit = () => {
    const name = normalizeCollabDisplayName(draft);
    if (!name) {
      setShowError(true);
      return;
    }
    onConfirm(name);
  };

  return (
    <CollabDialogPortal>
      <div
        className="fixed inset-0 z-[200]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="collab-join-name-dialog"
      >
        <div
          className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
          onClick={onCancel}
        />

        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
          <form
            className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl"
            onSubmit={event => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-300" aria-hidden="true" />
                <h2 id={titleId} className="text-base font-bold text-white">
                  Join live diagram
                </h2>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
                aria-label="Close join live diagram"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm text-slate-400 leading-relaxed">
                Enter the name others will see on your cursor.
              </p>
              <div>
                <label
                  htmlFor={inputId}
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Your name
                </label>
                <input
                  id={inputId}
                  type="text"
                  value={draft}
                  autoFocus
                  maxLength={40}
                  autoComplete="nickname"
                  aria-invalid={showError}
                  aria-describedby={showError ? errorId : undefined}
                  onChange={event => {
                    setDraft(event.target.value);
                    if (showError) setShowError(false);
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  placeholder="Ada"
                />
                {showError ? (
                  <p id={errorId} className="mt-1.5 text-xs text-rose-300">
                    Enter a name (1–40 characters).
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 transition cursor-pointer"
                >
                  Join
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </CollabDialogPortal>
  );
};
