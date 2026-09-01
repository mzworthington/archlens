import React, { useEffect, useId, useState } from 'react';
import { Users, X } from 'lucide-react';
import { normalizeCollabDisplayName, type CollabParticipant } from '../../../../../core';
import { CollabDialogPortal } from '../CollabNameDialog/CollabDialogPortal';

interface CollabShareDialogProps {
  isOpen: boolean;
  initialName?: string;
  participants: CollabParticipant[];
  onCopyLink: (name: string) => void;
  onSaveName: (name: string) => boolean;
  onCancel: () => void;
}

export const CollabShareDialog: React.FC<CollabShareDialogProps> = ({
  isOpen,
  initialName = '',
  participants,
  onCopyLink,
  onSaveName,
  onCancel,
}) => {
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const listId = useId();
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

  const validName = () => {
    const name = normalizeCollabDisplayName(draft);
    if (!name) {
      setShowError(true);
      return null;
    }
    return name;
  };

  return (
    <CollabDialogPortal>
      <div
        className="fixed inset-0 z-[200]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="collab-share-dialog"
      >
        <div
          className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
          onClick={onCancel}
        />

        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-300" aria-hidden="true" />
                <h2 id={titleId} className="text-base font-bold text-white">
                  Live diagram
                </h2>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
                aria-label="Close live diagram"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-400 leading-relaxed">
                Change the name on your cursor, see who is here, then copy the link.
              </p>

              <form
                className="space-y-2"
                onSubmit={event => {
                  event.preventDefault();
                  const name = validName();
                  if (!name) return;
                  onSaveName(name);
                }}
              >
                <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300">
                  Your name
                </label>
                <div className="flex gap-2">
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
                    className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    placeholder="Ada"
                  />
                  <button
                    type="submit"
                    className="shrink-0 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-800 text-slate-200 hover:bg-slate-900 transition cursor-pointer"
                  >
                    Save name
                  </button>
                </div>
                {showError ? (
                  <p id={errorId} className="text-xs text-rose-300">
                    Enter a name (1–40 characters).
                  </p>
                ) : null}
              </form>

              <section aria-labelledby={listId}>
                <h3 id={listId} className="text-xs font-semibold text-slate-300 mb-2">
                  In this session
                </h3>
                {participants.length === 0 ? (
                  <p className="text-sm text-slate-500" data-testid="collab-share-empty-roster">
                    You will be the first person in this session.
                  </p>
                ) : (
                  <ul className="space-y-1.5" data-testid="collab-share-roster">
                    {participants.map(person => (
                      <li key={person.clientId} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: person.color }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate text-slate-200">{person.name}</span>
                        {person.isLocal ? (
                          <span className="text-[11px] font-semibold text-slate-500">you</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = validName();
                    if (!name) return;
                    onCopyLink(name);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 transition cursor-pointer"
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CollabDialogPortal>
  );
};
