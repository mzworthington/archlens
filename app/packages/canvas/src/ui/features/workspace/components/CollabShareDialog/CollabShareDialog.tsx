import React, { useEffect, useId, useState } from 'react';
import { Users, X } from 'lucide-react';
import { normalizeCollabDisplayName, type CollabParticipant } from '../../../../../core';
import { collabShareAudienceCopy } from '../../../../../application/collab/collabShareAudience';
import { CollabDialogPortal } from '../CollabNameDialog/CollabDialogPortal';

export type CollabShareCopyOptions = {
  access: 'open' | 'secret';
  secret: string;
  expiresInHours: 0 | 8 | 24;
};

interface CollabShareDialogProps {
  isOpen: boolean;
  initialName?: string;
  participants: CollabParticipant[];
  canEndRoom?: boolean;
  audience?: 'same-browser' | 'joinable-link';
  onCopyLink: (name: string, options: CollabShareCopyOptions) => void;
  onSaveName: (name: string) => boolean;
  onEndRoom?: () => void;
  onCancel: () => void;
}

export const CollabShareDialog: React.FC<CollabShareDialogProps> = ({
  isOpen,
  initialName = '',
  participants,
  canEndRoom = false,
  audience = 'joinable-link',
  onCopyLink,
  onSaveName,
  onEndRoom,
  onCancel,
}) => {
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const listId = useId();
  const openAccessId = useId();
  const secretAccessId = useId();
  const shareSecretId = useId();
  const expireId = useId();
  const [draft, setDraft] = useState(initialName);
  const [showError, setShowError] = useState(false);
  const [access, setAccess] = useState<'open' | 'secret'>('open');
  const [secret, setSecret] = useState('');
  const [secretError, setSecretError] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<0 | 8 | 24>(0);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(initialName);
    setShowError(false);
    setSecretError(false);
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
                {collabShareAudienceCopy(audience)}
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

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-slate-300">Who can join</legend>
                <label className="flex items-start gap-2 text-sm text-slate-200 cursor-pointer">
                  <input
                    id={openAccessId}
                    type="radio"
                    name="collab-room-access"
                    checked={access === 'open'}
                    onChange={() => setAccess('open')}
                    className="mt-1"
                  />
                  <span>
                    Anyone with the link
                    <span className="block text-xs text-slate-500 font-normal">
                      A forwarded URL is enough to edit.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-200 cursor-pointer">
                  <input
                    id={secretAccessId}
                    type="radio"
                    name="collab-room-access"
                    checked={access === 'secret'}
                    onChange={() => setAccess('secret')}
                    className="mt-1"
                  />
                  <span>
                    Require a secret
                    <span className="block text-xs text-slate-500 font-normal">
                      Guests type this before they see the diagram. It is not in the link.
                    </span>
                  </span>
                </label>
              </fieldset>

              {access === 'secret' ? (
                <div>
                  <label
                    htmlFor={shareSecretId}
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Room secret
                  </label>
                  <input
                    id={shareSecretId}
                    type="password"
                    value={secret}
                    maxLength={128}
                    autoComplete="new-password"
                    aria-invalid={secretError}
                    onChange={event => {
                      setSecret(event.target.value);
                      if (secretError) setSecretError(false);
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  />
                  {secretError ? (
                    <p className="mt-1.5 text-xs text-rose-300">
                      Use at least 8 characters. Share it separately from the link.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500">
                      At least 8 characters. Tell people this out of band.
                    </p>
                  )}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor={expireId}
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  End automatically
                </label>
                <select
                  id={expireId}
                  value={expiresInHours}
                  onChange={event => {
                    const value = Number(event.target.value);
                    setExpiresInHours(value === 8 || value === 24 ? value : 0);
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <option value={0}>Keep until I end it</option>
                  <option value={8}>In 8 hours</option>
                  <option value={24}>In 24 hours</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {canEndRoom && onEndRoom ? (
                  <button
                    type="button"
                    onClick={onEndRoom}
                    className="mr-auto px-3 py-2 text-xs font-semibold rounded-lg text-rose-300 hover:text-rose-200 hover:bg-slate-900 transition cursor-pointer"
                  >
                    End this session
                  </button>
                ) : null}
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
                    if (access === 'secret' && secret.trim().length < 8) {
                      setSecretError(true);
                      return;
                    }
                    onCopyLink(name, { access, secret, expiresInHours });
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
