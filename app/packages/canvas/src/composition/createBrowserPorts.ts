import {
  BrowserFileSystemAdapter,
  BrowserWorkspaceAdapter,
} from '../infrastructure/fileSystem/fileSync';
import { createSampleWorkspacePort } from '../infrastructure/fileSystem/sampleWorkspaceLoader';
import { createBrowserLayoutRegistry } from '../infrastructure/layout/createBrowserLayoutRegistry';
import { reactFlowGraphChangeAdapter } from '../infrastructure/layout/reactFlowGraphChangeAdapter';
import { ConsoleLoggerAdapter } from '../infrastructure/logging/logger';
import { BrowserNetworkStatusAdapter } from '../infrastructure/network/browserNetworkStatus';
import { dexieWorkingCopyAdapter } from '../infrastructure/db/dexieWorkingCopyAdapter';
import { runResilienceWasmSimulation } from '../infrastructure/resilience/wasmClient';
import { createBroadcastChannelTransport } from '../infrastructure/collab/broadcastChannelTransport';
import { createWebsocketCollabTransport } from '../infrastructure/collab/websocketCollabTransport';
import { createYjsCollabSession } from '../infrastructure/collab/yjsCollabSessionAdapter';
import type {
  FileSystemPort,
  WorkspacePort,
  LoggerPort,
  LayoutRegistryPort,
  WorkingCopyPort,
  GraphChangePort,
  NetworkStatusPort,
  ResilienceEnginePort,
  CollabSessionPort,
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
  collabSessionPort: CollabSessionPort;
};

/** Browser composition root - only place that constructs concrete adapters. */
export function createBrowserPorts(): BrowserPorts {
  const wsUrl = import.meta.env.VITE_COLLAB_WS_URL?.trim();
  const transport = wsUrl
    ? createWebsocketCollabTransport(wsUrl)
    : createBroadcastChannelTransport();

  return {
    fileSystemPort: BrowserFileSystemAdapter,
    folderWorkspacePort: BrowserWorkspaceAdapter,
    sampleWorkspacePort: createSampleWorkspacePort(),
    logger: ConsoleLoggerAdapter,
    layoutRegistry: createBrowserLayoutRegistry(),
    workingCopyPort: dexieWorkingCopyAdapter,
    graphChangePort: reactFlowGraphChangeAdapter,
    networkStatus: BrowserNetworkStatusAdapter,
    resilienceEnginePort: {
      runSimulation: runResilienceWasmSimulation,
    },
    collabSessionPort: createYjsCollabSession({ transport }),
  };
}
