import React, { useCallback, useMemo } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { SourceCodeDialog } from './SourceCodeDialog';

export const WorkspaceSourceCodeDialog: React.FC = () => {
  const {
    isSourceCodeOpen,
    sourceCodeFilepath,
    sourceCodeProvenance,
    closeSourceCodeDialog,
    schema,
    loadedSystems,
    currentFilePath,
    isWorkspaceOpen,
    isSampleWorkspace,
    workspacePort,
  } = useBlueprintStore();

  const sourceProvenance = useMemo(() => {
    if (sourceCodeProvenance) return sourceCodeProvenance;
    if (schema.source) return schema.source;
    return loadedSystems.find(s => s.path === currentFilePath)?.schema.source;
  }, [sourceCodeProvenance, schema.source, loadedSystems, currentFilePath]);

  const readLocalFile = useCallback(
    (relativePath: string) => workspacePort.readFile(relativePath),
    [workspacePort]
  );

  return (
    <SourceCodeDialog
      isOpen={isSourceCodeOpen}
      onClose={closeSourceCodeDialog}
      filepath={sourceCodeFilepath ?? undefined}
      source={sourceProvenance}
      isWorkspaceOpen={isWorkspaceOpen && !isSampleWorkspace}
      readLocalFile={readLocalFile}
    />
  );
};
