import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { markFolderWorkspacePreferred } from '../../../../application/store/workspaceOpenSession';
import { EMPTY_WORKSPACE_ENTITY_REF } from '../../../../application/store/states/diagramState/resetToEmptyWorkspace';
import { buildWorkspaceEntityHref } from '../../../../application/store/sandboxWorkspace';

export function useWorkspaceBlankEntry() {
  const [, setLocation] = useLocation();
  const { setIsStartupOpen, setIsImportMermaidOpen, resetToEmptyWorkspace } = useBlueprintStore();

  const startBlankCanvas = useCallback(() => {
    // Treat as an explicit non-demo choice so deep-link bootstrap does not force the sample.
    markFolderWorkspacePreferred();
    resetToEmptyWorkspace();
    setIsStartupOpen(false);
    setLocation(buildWorkspaceEntityHref(EMPTY_WORKSPACE_ENTITY_REF), { replace: true });
  }, [resetToEmptyWorkspace, setIsStartupOpen, setLocation]);

  const importMermaid = useCallback(() => {
    startBlankCanvas();
    setIsImportMermaidOpen(true);
  }, [setIsImportMermaidOpen, startBlankCanvas]);

  return {
    startBlankCanvas,
    importMermaid,
  };
}
