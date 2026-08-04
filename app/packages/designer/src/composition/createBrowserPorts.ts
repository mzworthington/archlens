import {
  BrowserFileSystemAdapter,
  BrowserWorkspaceAdapter,
} from '../infrastructure/fileSystem/fileSync';
import { BundledSampleWorkspaceAdapter } from '../infrastructure/fileSystem/bundledSampleWorkspace';
import { createRemoteCatalogWorkspaceAdapter } from '../infrastructure/fileSystem/remoteCatalogWorkspace';
import { BUNDLED_WORKSPACE_NAME } from '../application/store/samplesWorkspace';
import { createBrowserLayoutRegistry } from '../infrastructure/layout/createBrowserLayoutRegistry';
import { reactFlowGraphChangeAdapter } from '../infrastructure/layout/reactFlowGraphChangeAdapter';
import { ConsoleLoggerAdapter } from '../infrastructure/logging/logger';
import { BrowserNetworkStatusAdapter } from '../infrastructure/network/browserNetworkStatus';
import { dexieWorkingCopyAdapter } from '../infrastructure/db/dexieWorkingCopyAdapter';
import { runResilienceWasmSimulation } from '../infrastructure/resilience/wasmClient';
import type {
  FileSystemPort,
  WorkspacePort,
  LoggerPort,
  LayoutRegistryPort,
  WorkingCopyPort,
  GraphChangePort,
  NetworkStatusPort,
  ResilienceEnginePort,
} from '../core';

export type BrowserPorts = {
  fileSystemPort: FileSystemPort;
  folderWorkspacePort: WorkspacePort;
  sampleWorkspacePort: WorkspacePort;
  logger: LoggerPort;
  layoutRegistry: LayoutRegistryPort;
  workingCopyPort: WorkingCopyPort;
  graphChangePort: GraphChangePort;
  networkStatus: NetworkStatusPort;
  resilienceEnginePort: ResilienceEnginePort;
};

/** Browser composition root — only place that constructs concrete adapters. */
export function createBrowserPorts(): BrowserPorts {
  const remoteCatalogBaseUrl = import.meta.env.VITE_REMOTE_CATALOG_BASE_URL?.trim();
  const sampleWorkspacePort = remoteCatalogBaseUrl
    ? createRemoteCatalogWorkspaceAdapter({
        baseUrl: remoteCatalogBaseUrl,
        workspaceName: BUNDLED_WORKSPACE_NAME,
      })
    : BundledSampleWorkspaceAdapter;

  return {
    fileSystemPort: BrowserFileSystemAdapter,
    folderWorkspacePort: BrowserWorkspaceAdapter,
    sampleWorkspacePort,
    logger: ConsoleLoggerAdapter,
    layoutRegistry: createBrowserLayoutRegistry(),
    workingCopyPort: dexieWorkingCopyAdapter,
    graphChangePort: reactFlowGraphChangeAdapter,
    networkStatus: BrowserNetworkStatusAdapter,
    resilienceEnginePort: {
      runSimulation: runResilienceWasmSimulation,
    },
  };
}
