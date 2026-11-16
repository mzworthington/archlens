import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBlueprintStore } from '../../../../application/store/store';

/** Debounce window before quietly committing the live room draft to disk. */
export const COLLAB_DISK_AUTOSAVE_MS = 2_500;

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

  useEffect(() => {
    const clear = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    if (
      !collabRoomActive ||
      !isWorkspaceOpen ||
      isSampleWorkspace ||
      !hasPendingChanges ||
      !currentFilePath
    ) {
      clear();
      return clear;
    }

    clear();
    timerRef.current = setTimeout(() => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      void saveActiveDiagram({ quiet: true }).finally(() => {
        inFlightRef.current = false;
      });
    }, COLLAB_DISK_AUTOSAVE_MS);

    return clear;
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
