import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  parseCollabRoomId,
  withoutCollabRoom,
} from '../../../../application/navigation/collabRoomUrl';
import {
  getCollabPrefillDisplayName,
  getCollabSessionDisplayName,
  setCollabDisplayName,
  subscribeCollabDisplayName,
} from '../../../../application/collab/collabDisplayName';

export type CollabRoomSync = {
  needsDisplayName: boolean;
  prefillName: string;
  confirmDisplayName: (name: string) => void;
  cancelJoin: () => void;
};

/** Join or leave the collab session from the `room` query param. */
export function useCollabRoomSync(): CollabRoomSync {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const joinCollabRoom = useBlueprintStore(s => s.joinCollabRoom);
  const leaveCollabRoom = useBlueprintStore(s => s.leaveCollabRoom);
  const joinedRef = useRef<string | null>(null);
  const displayName = useSyncExternalStore(
    subscribeCollabDisplayName,
    getCollabSessionDisplayName,
    () => null
  );
  const prefillName = useSyncExternalStore(
    subscribeCollabDisplayName,
    getCollabPrefillDisplayName,
    () => ''
  );

  const roomId = parseCollabRoomId(search);
  const needsDisplayName = Boolean(roomId && !displayName);

  useEffect(() => {
    if (!roomId || !displayName) {
      if (joinedRef.current) {
        leaveCollabRoom();
        joinedRef.current = null;
      }
      return;
    }
    if (joinedRef.current === roomId) return;
    joinedRef.current = roomId;
    void joinCollabRoom(roomId, displayName);
  }, [search, displayName, joinCollabRoom, leaveCollabRoom, roomId]);

  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        useBlueprintStore.getState().leaveCollabRoom();
        joinedRef.current = null;
      }
    };
  }, []);

  const confirmDisplayName = useCallback((name: string) => {
    setCollabDisplayName(name);
  }, []);

  const cancelJoin = useCallback(() => {
    setLocation(withoutCollabRoom(pathname, search));
  }, [pathname, search, setLocation]);

  return { needsDisplayName, prefillName, confirmDisplayName, cancelJoin };
}
