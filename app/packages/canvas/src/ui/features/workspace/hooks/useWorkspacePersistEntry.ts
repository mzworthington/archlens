import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { GOLDEN_JOURNEY_ENTITY_REF } from '../../../../application/store/samplesWorkspace';
import { buildChaosLensUrl } from '../../../../application/resilience/chaosLensUrl';
import { useBlueprintStore } from '../../../../application/store/store';
import { navigateToActiveWorkspaceEntity } from './navigateToActiveWorkspaceEntity';

type WorkspacePersistEntryDeps = {
  startBlankCanvas: () => void;
};

export function useWorkspacePersistEntry({ startBlankCanvas }: WorkspacePersistEntryDeps) {
  const [, setLocation] = useLocation();
  const {
    setIsStartupOpen,
    setIsImportIacOpen,
    openWorkspaceDirectory,
    openBundledSample,
    openBrowserLiteScan,
  } = useBlueprintStore();

  const openSample = useCallback(async () => {
    const opened = await openBundledSample();
    if (!opened) return false;

    setIsStartupOpen(false);
    // Insight path: ChaosLens on the golden journey estate.
    setLocation(buildChaosLensUrl(GOLDEN_JOURNEY_ENTITY_REF), { replace: true });
    return true;
  }, [openBundledSample, setIsStartupOpen, setLocation]);

  const openDirectory = useCallback(async () => {
    try {
      const opened = await openWorkspaceDirectory();
      if (!opened) return false;
      setIsStartupOpen(false);
      navigateToActiveWorkspaceEntity(setLocation);
      return true;
    } catch (err) {
      console.error('Failed to open workspace directory:', err);
      return false;
    }
  }, [openWorkspaceDirectory, setIsStartupOpen, setLocation]);

  const openBrowserScan = useCallback(async () => {
    try {
      const opened = await openBrowserLiteScan();
      if (!opened) return false;
      setIsStartupOpen(false);
      navigateToActiveWorkspaceEntity(setLocation);
      return true;
    } catch (err) {
      console.error('Failed to run browser lite scan:', err);
      return false;
    }
  }, [openBrowserLiteScan, setIsStartupOpen, setLocation]);

  const importIac = useCallback(() => {
    startBlankCanvas();
    setIsImportIacOpen(true);
  }, [setIsImportIacOpen, startBlankCanvas]);

  return {
    openSample,
    openDirectory,
    openBrowserScan,
    importIac,
  };
}
