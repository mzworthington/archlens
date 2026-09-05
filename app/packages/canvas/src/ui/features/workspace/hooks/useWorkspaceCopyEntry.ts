import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { navigateToActiveWorkspaceEntity } from './navigateToActiveWorkspaceEntity';
import { useCollabShareSession } from './useCollabShareSession';

type WorkspaceCopyEntryDeps = {
  startBlankCanvas: () => void;
};

export function useWorkspaceCopyEntry({ startBlankCanvas }: WorkspaceCopyEntryDeps) {
  const [, setLocation] = useLocation();
  const collabShare = useCollabShareSession();
  const { setIsStartupOpen, openWorkspaceDirectory, loadSchema } = useBlueprintStore();

  const shareBlankCanvas = useCallback(() => {
    startBlankCanvas();
    collabShare.openShareDialog();
  }, [collabShare, startBlankCanvas]);

  const shareDirectory = useCallback(async () => {
    try {
      const opened = await openWorkspaceDirectory();
      if (!opened) return;
      setIsStartupOpen(false);
      navigateToActiveWorkspaceEntity(setLocation);
      collabShare.openShareDialog();
    } catch (err) {
      console.error('Failed to open workspace directory for share:', err);
    }
  }, [collabShare, openWorkspaceDirectory, setIsStartupOpen, setLocation]);

  const shareFile = useCallback(async () => {
    try {
      const opened = await loadSchema();
      if (!opened) return;
      setIsStartupOpen(false);
      collabShare.openShareDialog();
    } catch (err) {
      console.error('Failed to open file for share:', err);
    }
  }, [collabShare, loadSchema, setIsStartupOpen]);

  return {
    collabShare,
    shareBlankCanvas,
    shareDirectory,
    shareFile,
  };
}
