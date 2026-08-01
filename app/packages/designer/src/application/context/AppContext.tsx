/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect } from 'react';
import {
  BrowserFileSystemAdapter,
  BrowserWorkspaceAdapter,
} from '../../infrastructure/fileSystem/fileSync';
import { createBrowserLayoutRegistry } from '../../infrastructure/layout/createBrowserLayoutRegistry';
import { reactFlowGraphChangeAdapter } from '../../infrastructure/layout/reactFlowGraphChangeAdapter';
import { ConsoleLoggerAdapter } from '../../infrastructure/logging/logger';
import { BrowserNetworkStatusAdapter } from '../../infrastructure/network/browserNetworkStatus';
import { dexieWorkingCopyAdapter } from '../../infrastructure/db/dexieWorkingCopyAdapter';
import type { NetworkStatusPort } from '../../core';
import { useBlueprintStore } from '../store/store';

interface AppContextProps {
  fileSystemPort: typeof BrowserFileSystemAdapter;
  workspacePort: typeof BrowserWorkspaceAdapter;
  logger: typeof ConsoleLoggerAdapter;
  networkStatus: NetworkStatusPort;
}

const AppContext = createContext<AppContextProps | null>(null);

const browserLayoutRegistry = createBrowserLayoutRegistry();

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Wire up the infrastructure adapters to the Zustand store at launch
  useEffect(() => {
    const state = useBlueprintStore.getState();
    state.setPorts({
      fileSystemPort: BrowserFileSystemAdapter,
      // Preserve the bundled sample adapter when already open — StrictMode remounts
      // and races with "Open demo blueprints" used to overwrite it with the folder
      // adapter, breaking lazy diagram loads (zoom-out / URL sync).
      ...(state.isSampleWorkspace ? {} : { workspacePort: BrowserWorkspaceAdapter }),
      logger: ConsoleLoggerAdapter,
      layoutRegistry: browserLayoutRegistry,
      workingCopyPort: dexieWorkingCopyAdapter,
      graphChangePort: reactFlowGraphChangeAdapter,
    });

    // Deep-linked `/workspace/...` routes load diagrams via URL sync instead.
  }, []);

  return (
    <AppContext.Provider
      value={{
        fileSystemPort: BrowserFileSystemAdapter,
        workspacePort: BrowserWorkspaceAdapter,
        logger: ConsoleLoggerAdapter,
        networkStatus: BrowserNetworkStatusAdapter,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
