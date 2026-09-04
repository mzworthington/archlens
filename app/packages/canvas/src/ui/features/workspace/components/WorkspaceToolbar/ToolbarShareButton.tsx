import React, { useCallback, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  createCollabRoomId,
  parseCollabRoomId,
  withCollabRoom,
} from '../../../../../application/navigation/collabRoomUrl';
import { getCollabPrefillDisplayName } from '../../../../../application/collab/collabDisplayName';
import {
  readCollabHostToken,
  stageCollabHostShare,
} from '../../../../../application/collab/collabRoomCredentials';
import {
  CollabShareDialog,
  type CollabShareCopyOptions,
} from '../CollabShareDialog/CollabShareDialog';

const iconBtnClass =
  'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:text-slate-400 transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center';

export const ToolbarShareButton: React.FC = () => {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const isLoading = useBlueprintStore(s => s.isLoading);
  const setNotification = useBlueprintStore(s => s.setNotification);
  const isActive = useBlueprintStore(s => s.collabSessionPort.isActive());
  const connectedCount = useBlueprintStore(s => s.collabPresence.connectedCount);
  const participants = useBlueprintStore(s => s.collabPresence.participants);
  const updateCollabDisplayName = useBlueprintStore(s => s.updateCollabDisplayName);
  const endCollabRoom = useBlueprintStore(s => s.endCollabRoom);
  const roomFromUrl = parseCollabRoomId(search);
  const [shareOpen, setShareOpen] = useState(false);

  const copyShareLink = useCallback(
    async (roomId: string) => {
      const next = withCollabRoom(pathname, search, roomId);
      setLocation(next);
      const url = `${window.location.origin}${next}`;
      try {
        await navigator.clipboard.writeText(url);
        setNotification({
          type: 'success',
          title: 'Share link copied',
          message: 'Open this link in another tab to edit the diagram together.',
        });
      } catch {
        setNotification({
          type: 'info',
          title: 'Share this link',
          message: url,
        });
      }
    },
    [pathname, search, setLocation, setNotification]
  );

  const handleCopyLink = useCallback(
    (name: string, options: CollabShareCopyOptions) => {
      updateCollabDisplayName(name);
      const roomId = roomFromUrl ?? createCollabRoomId();
      stageCollabHostShare(roomId, options);
      void copyShareLink(roomId);
    },
    [copyShareLink, roomFromUrl, updateCollabDisplayName]
  );

  const peopleLabel =
    connectedCount === 1 ? '1 person editing' : `${connectedCount} people editing`;
  const ariaLabel =
    isActive && connectedCount > 0 ? `Share live diagram, ${peopleLabel}` : 'Share live diagram';

  return (
    <>
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          disabled={Boolean(isLoading)}
          className={`${iconBtnClass} ${isActive || roomFromUrl ? 'text-sky-300 hover:text-sky-200 border-sky-900/40' : ''}`}
          title={
            isActive && connectedCount > 0
              ? `Live diagram · ${peopleLabel}`
              : 'Share a live editing link'
          }
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={shareOpen}
          aria-pressed={Boolean(isActive || roomFromUrl)}
          data-testid="toolbar-share-collab"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        {isActive && connectedCount > 0 ? (
          <span
            data-testid="collab-connected-count"
            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-sky-500 text-[10px] font-bold leading-4 text-slate-950 text-center pointer-events-none"
            aria-hidden="true"
          >
            {connectedCount}
          </span>
        ) : null}
      </span>
      <CollabShareDialog
        isOpen={shareOpen}
        initialName={getCollabPrefillDisplayName()}
        participants={participants}
        canEndRoom={Boolean(roomFromUrl && readCollabHostToken(roomFromUrl))}
        onCopyLink={handleCopyLink}
        onSaveName={updateCollabDisplayName}
        onEndRoom={() => {
          endCollabRoom();
          setShareOpen(false);
        }}
        onCancel={() => setShareOpen(false)}
      />
    </>
  );
};
