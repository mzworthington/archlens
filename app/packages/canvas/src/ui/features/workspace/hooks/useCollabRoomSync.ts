import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  enableCollaborationFromShareLink,
  parseCollabRoomId,
  withoutCollabRoom,
} from '../../../../application/navigation/collabRoomUrl';
import {
  COLLABORATION_FEATURE,
  isFeatureEnabled,
} from '../../../../application/navigation/featureGate';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
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

/** Join or leave the collab session from the `room` query param when the feature is on. */
export function useCollabRoomSync(): CollabRoomSync {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const collabEnabled = useFeatureFlag(COLLABORATION_FEATURE);
  const joinCollabRoom = useBlueprintStore(s => s.joinCollabRoom);
  const leaveCollabRoom = useBlueprintStore(s => s.leaveCollabRoom);
  const joinedRef = useRef<string | null>(null);
  const unlockedRoomRef = useRef<string | null>(null);
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
  const unlocked = isFeatureEnabled(COLLABORATION_FEATURE);
  const needsDisplayName = Boolean(unlocked && roomId && !displayName);

  useEffect(() => {
    if (roomId && unlockedRoomRef.current !== roomId) {
      unlockedRoomRef.current = roomId;
      enableCollaborationFromShareLink(search);
    }

    const canJoin = isFeatureEnabled(COLLABORATION_FEATURE) && roomId && displayName;
    if (!canJoin) {
      if (joinedRef.current) {
        leaveCollabRoom();
        joinedRef.current = null;
      }
      return;
    }
    if (joinedRef.current === roomId) return;
    joinedRef.current = roomId;
    void joinCollabRoom(roomId, displayName);
  }, [search, collabEnabled, displayName, joinCollabRoom, leaveCollabRoom, roomId]);

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
