import { useCallback, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  createCollabRoomId,
  parseCollabRoomId,
  withCollabRoom,
} from '../../../../application/navigation/collabRoomUrl';
import { getCollabPrefillDisplayName } from '../../../../application/collab/collabDisplayName';
import {
  readCollabHostToken,
  stageCollabHostShare,
} from '../../../../application/collab/collabRoomCredentials';
import type { CollabShareCopyOptions } from '../components/CollabShareDialog/CollabShareDialog';

/** Share-dialog state shared by toolbar and startup Collaborate intent. */
export function useCollabShareSession() {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const setNotification = useBlueprintStore(s => s.setNotification);
  const participants = useBlueprintStore(s => s.collabPresence.participants);
  const updateCollabDisplayName = useBlueprintStore(s => s.updateCollabDisplayName);
  const endCollabRoom = useBlueprintStore(s => s.endCollabRoom);
  const roomFromUrl = parseCollabRoomId(search);
  const [shareOpen, setShareOpen] = useState(false);

  const openShareDialog = useCallback(() => {
    setShareOpen(true);
  }, []);

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

  const handleEndRoom = useCallback(() => {
    endCollabRoom();
    setShareOpen(false);
  }, [endCollabRoom]);

  return {
    shareOpen,
    setShareOpen,
    openShareDialog,
    participants,
    initialName: getCollabPrefillDisplayName(),
    canEndRoom: Boolean(roomFromUrl && readCollabHostToken(roomFromUrl)),
    handleCopyLink,
    handleEndRoom,
    onSaveName: updateCollabDisplayName,
    onCancelShare: () => setShareOpen(false),
  };
}
