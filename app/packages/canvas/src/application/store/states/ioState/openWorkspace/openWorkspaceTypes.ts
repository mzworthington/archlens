import type { SystemSchema, WorkspaceCatalogEntry } from '@archlens/core';
import type { WorkingCopyPort } from '../../../../../core';
import type { ToastNotification } from '../../uiState';
import type { BlueprintStoreSet } from '../../../store';

export type LoadedSystem = { path: string; name: string; schema: SystemSchema };

export type WorkspaceOpenLogger = {
  info: (m: string, meta?: Record<string, unknown>) => void;
  warn: (m: string, meta?: Record<string, unknown>) => void;
  error: (m: string, err?: unknown) => void;
};

export type OpenWorkspaceDeps = {
  selectDirectory: () => Promise<boolean>;
  readDirectoryFiles: () => Promise<Array<{ name: string; content: string }>>;
  getDirectoryName: () => string;
  workingCopy: WorkingCopyPort;
  logger: WorkspaceOpenLogger;
  setNotification?: (n: ToastNotification | null) => void;
  initSchema: (schema: SystemSchema) => void;
  set: BlueprintStoreSet;
  isSampleWorkspace?: boolean;
  committedPorts?: Record<string, unknown>;
};

export type LoadWorkspaceFromCatalogDeps = {
  catalog: WorkspaceCatalogEntry[];
  entryPath: string;
  readFile: (relativePath: string) => Promise<string>;
  getDirectoryName: () => string;
  workingCopy: WorkingCopyPort;
  logger: WorkspaceOpenLogger;
  setNotification?: (n: ToastNotification | null) => void;
  initSchema: (schema: SystemSchema) => void;
  set: BlueprintStoreSet;
  isSampleWorkspace?: boolean;
  openGeneration?: number;
  committedPorts?: Record<string, unknown>;
};

export type LoadWorkspaceFromYamlFilesDeps = {
  files: Array<{ name: string; content: string }>;
  workspaceName: string;
  workingCopy: WorkingCopyPort;
  logger: WorkspaceOpenLogger;
  setNotification?: (n: ToastNotification | null) => void;
  initSchema: (schema: SystemSchema) => void;
  set: BlueprintStoreSet;
  isSampleWorkspace?: boolean;
  isBrowserLiteWorkspace?: boolean;
  openGeneration?: number;
  committedPorts?: Record<string, unknown>;
  preferredEntryPath?: string;
};
