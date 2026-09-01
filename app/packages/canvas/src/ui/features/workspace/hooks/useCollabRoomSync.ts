import { useEffect, useRef } from 'react';
import { useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  enableCollaborationFromShareLink,
  parseCollabRoomId,
} from '../../../../application/navigation/collabRoomUrl';
import {
  COLLABORATION_FEATURE,
  isFeatureEnabled,
} from '../../../../application/navigation/featureGate';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

/** Join or leave the collab session from the `room` query param when the feature is on. */
export function useCollabRoomSync(): void {
  const search = useSearch();
  const collabEnabled = useFeatureFlag(COLLABORATION_FEATURE);
  const joinCollabRoom = useBlueprintStore(s => s.joinCollabRoom);
  const leaveCollabRoom = useBlueprintStore(s => s.leaveCollabRoom);
  const joinedRef = useRef<string | null>(null);
  const unlockedRoomRef = useRef<string | null>(null);

  useEffect(() => {
    const roomId = parseCollabRoomId(search);
    if (roomId && unlockedRoomRef.current !== roomId) {
      unlockedRoomRef.current = roomId;
      enableCollaborationFromShareLink(search);
    }

    const unlocked = isFeatureEnabled(COLLABORATION_FEATURE);
    if (!unlocked || !roomId) {
      if (joinedRef.current) {
        leaveCollabRoom();
        joinedRef.current = null;
      }
      return;
    }
    if (joinedRef.current === roomId) return;
    joinedRef.current = roomId;
    void joinCollabRoom(roomId);
  }, [search, collabEnabled, joinCollabRoom, leaveCollabRoom]);

  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        useBlueprintStore.getState().leaveCollabRoom();
        joinedRef.current = null;
      }
    };
  }, []);
}
