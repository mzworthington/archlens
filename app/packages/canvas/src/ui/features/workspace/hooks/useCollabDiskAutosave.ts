import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBlueprintStore } from '../../../../application/store/store';

/** Debounce window before quietly committing the live room draft to disk. */
export const COLLAB_DISK_AUTOSAVE_MS = 2_500;

/**
 * While a folder workspace is in a live room, debounce-commit the active
 * diagram to disk so room expiry is not the only copy.
 * Sample and blank (no folder) sessions stay manual.
 *
 * In-flight quiet saves are generation-gated so Keep disk cannot be undone,
 * and skipped/failed saves reschedule while pending changes remain.
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
  const pendingRetryRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    const clear = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    generationRef.current += 1;
    const generation = generationRef.current;
    const scheduledYaml = yamlCode;

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

    const schedule = () => {
      clear();
      timerRef.current = setTimeout(() => {
        void runSave();
      }, COLLAB_DISK_AUTOSAVE_MS);
    };

    const runSave = async () => {
      if (generationRef.current !== generation) return;
      if (inFlightRef.current) {
        pendingRetryRef.current = true;
        return;
      }
      inFlightRef.current = true;
      pendingRetryRef.current = false;
      try {
        await saveActiveDiagram({
          quiet: true,
          isCurrent: () => {
            const state = useBlueprintStore.getState();
            return (
              generationRef.current === generation &&
              state.hasPendingChanges === true &&
              state.yamlCode === scheduledYaml &&
              state.currentFilePath === currentFilePath
            );
          },
        });
      } finally {
        inFlightRef.current = false;
        const state = useBlueprintStore.getState();
        const stillPending =
          generationRef.current === generation &&
          state.collabRoomActive &&
          state.isWorkspaceOpen &&
          !state.isSampleWorkspace &&
          Boolean(state.currentFilePath) &&
          (pendingRetryRef.current || state.hasPendingChanges);
        if (stillPending) {
          pendingRetryRef.current = false;
          schedule();
        }
      }
    };

    schedule();
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
