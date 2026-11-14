import React, { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
    githubPat,
    setGithubPat,
  } = useBlueprintStore(
    useShallow(s => ({
      isSourceCodeOpen: s.isSourceCodeOpen,
      sourceCodeFilepath: s.sourceCodeFilepath,
      sourceCodeProvenance: s.sourceCodeProvenance,
      closeSourceCodeDialog: s.closeSourceCodeDialog,
      schema: s.schema,
      loadedSystems: s.loadedSystems,
      currentFilePath: s.currentFilePath,
      isWorkspaceOpen: s.isWorkspaceOpen,
      isSampleWorkspace: s.isSampleWorkspace,
      workspacePort: s.workspacePort,
      githubPat: s.githubPat,
      setGithubPat: s.setGithubPat,
    }))
  );

  const sourceProvenance = useMemo(() => {
    if (sourceCodeProvenance?.remoteUrl) return sourceCodeProvenance;
    if (schema.source?.remoteUrl) return schema.source;
    const matchingSystem = loadedSystems.find(s => s.path === currentFilePath)?.schema?.source;
    if (matchingSystem?.remoteUrl) return matchingSystem;
    const anySystemWithRemote = loadedSystems.find(s => s.schema?.source?.remoteUrl)?.schema
      ?.source;
    if (anySystemWithRemote) return anySystemWithRemote;
    return sourceCodeProvenance || schema.source;
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
      githubPat={githubPat}
      onSavePat={setGithubPat}
    />
  );
};
