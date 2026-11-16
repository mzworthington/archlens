import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBlueprintStore } from '../../../../application/store/store';

/** Debounce window before quietly committing the live room draft to disk. */
export const COLLAB_DISK_AUTOSAVE_MS = 2_500;

function shouldQuietSaveCollabDiagram(state: {
  collabRoomActive: boolean;
  isWorkspaceOpen: boolean;
  isSampleWorkspace: boolean;
  hasPendingChanges: boolean;
  currentFilePath: string;
}): boolean {
  return (
    state.collabRoomActive &&
    state.isWorkspaceOpen &&
    !state.isSampleWorkspace &&
    state.hasPendingChanges &&
    Boolean(state.currentFilePath)
  );
}

/**
 * While a folder workspace is in a live room, debounce-commit the active
 * diagram to disk so room expiry / Keep disk races do not wipe the only copy.
 * Sample and blank (no folder) sessions stay manual.
 */
export function useCollabDiskAutosave(): void {
  const {
    collabRoomActive,
    isWorkspaceOpen,
    isSampleWorkspace,
    hasPendingChanges,
    yamlCode,
    currentFilePath,
    saveActiveDiagram,
  } = useBlueprintStore(
    useShallow(s => ({
      collabRoomActive: s.collabRoomActive,
      isWorkspaceOpen: s.isWorkspaceOpen,
      isSampleWorkspace: s.isSampleWorkspace,
      hasPendingChanges: s.hasPendingChanges,
      yamlCode: s.yamlCode,
      currentFilePath: s.currentFilePath,
      saveActiveDiagram: s.saveActiveDiagram,
    }))
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const retryRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const eligibleNow = () => shouldQuietSaveCollabDiagram(useBlueprintStore.getState());

    const arm = () => {
      if (!mountedRef.current || !eligibleNow()) return;
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!eligibleNow()) return;
        if (inFlightRef.current) {
          retryRef.current = true;
          return;
        }
        inFlightRef.current = true;
        retryRef.current = false;
        const save = useBlueprintStore.getState().saveActiveDiagram;
        void save({ quiet: true })
          .then(
            ok => {
              if (!ok) retryRef.current = true;
            },
            () => {
              retryRef.current = true;
            }
          )
          .finally(() => {
            inFlightRef.current = false;
            if (!mountedRef.current || !retryRef.current || !eligibleNow()) {
              retryRef.current = false;
              return;
            }
            retryRef.current = false;
            arm();
          });
      }, COLLAB_DISK_AUTOSAVE_MS);
    };

    if (
      !shouldQuietSaveCollabDiagram({
        collabRoomActive,
        isWorkspaceOpen,
        isSampleWorkspace,
        hasPendingChanges,
        currentFilePath,
      })
    ) {
      clearTimer();
      retryRef.current = false;
      return;
    }

    arm();
    return clearTimer;
  }, [
    collabRoomActive,
    isWorkspaceOpen,
    isSampleWorkspace,
    hasPendingChanges,
    yamlCode,
    currentFilePath,
    saveActiveDiagram,
  ]);
}
