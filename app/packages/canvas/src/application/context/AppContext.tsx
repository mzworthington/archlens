/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type {
  FileSystemPort,
  WorkspacePort,
  LoggerPort,
  NetworkStatusPort,
  LayoutRegistryPort,
  WorkingCopyPort,
  GraphChangePort,
  ResilienceEnginePort,
  CollabSessionPort,
} from '../../core';
import {
  noopFileSystem,
  noopWorkspace,
  noopLogger,
  noopLayoutRegistry,
  noopWorkingCopy,
  noopGraphChange,
  noopResilienceEngine,
  alwaysOnlineNetworkStatus,
  noopCollabSession,
} from '../../core';
import { useBlueprintStore } from '../store/store';

export type AppPorts = {
  fileSystemPort: FileSystemPort;
  folderWorkspacePort: WorkspacePort;
  sampleWorkspacePort: WorkspacePort;
  logger: LoggerPort;
  layoutRegistry: LayoutRegistryPort;
  workingCopyPort: WorkingCopyPort;
  graphChangePort: GraphChangePort;
  networkStatus: NetworkStatusPort;
  resilienceEnginePort: ResilienceEnginePort;
  collabSessionPort: CollabSessionPort;
};

interface AppContextProps {
  fileSystemPort: FileSystemPort;
  workspacePort: WorkspacePort;
  logger: LoggerPort;
  networkStatus: NetworkStatusPort;
}

const AppContext = createContext<AppContextProps | null>(null);

const defaultPorts: AppPorts = {
  fileSystemPort: noopFileSystem,
  folderWorkspacePort: noopWorkspace,
  sampleWorkspacePort: noopWorkspace,
  logger: noopLogger,
  layoutRegistry: noopLayoutRegistry,
  workingCopyPort: noopWorkingCopy,
  graphChangePort: noopGraphChange,
  networkStatus: alwaysOnlineNetworkStatus,
  resilienceEnginePort: noopResilienceEngine,
  collabSessionPort: noopCollabSession,
};

export const AppProvider: React.FC<{ children: React.ReactNode; ports?: AppPorts }> = ({
  children,
  ports: portsProp,
}) => {
  const ports = portsProp ?? defaultPorts;

  // Wire infrastructure adapters into the Zustand store at launch (composition root).
  useEffect(() => {
    const state = useBlueprintStore.getState();
    state.setPorts({
      fileSystemPort: ports.fileSystemPort,
      folderWorkspacePort: ports.folderWorkspacePort,
      sampleWorkspacePort: ports.sampleWorkspacePort,
      // Preserve sample / in-memory lite-scan adapters on remount. After a scan is
      // saved to a folder, bind the folder port so draft/commit writes to disk.
      ...(state.isSampleWorkspace ||
      (state.isBrowserLiteWorkspace && !state.browserLiteSavedToFolder)
        ? {}
        : { workspacePort: ports.folderWorkspacePort }),
      logger: ports.logger,
      layoutRegistry: ports.layoutRegistry,
      workingCopyPort: ports.workingCopyPort,
      graphChangePort: ports.graphChangePort,
      resilienceEnginePort: ports.resilienceEnginePort,
      collabSessionPort: ports.collabSessionPort,
    });

    // Deep-linked `/workspace/...` routes load diagrams via URL sync instead.
  }, [ports]);

  const value = useMemo<AppContextProps>(
    () => ({
      fileSystemPort: ports.fileSystemPort,
      workspacePort: ports.folderWorkspacePort,
      logger: ports.logger,
      networkStatus: ports.networkStatus,
    }),
    [ports]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
