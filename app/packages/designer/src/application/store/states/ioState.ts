import type { DiagramState } from './diagramState';
import type { UiState } from './uiState';
import {
  type FileSystemPort,
  type WorkspacePort,
  type LoggerPort,
  type LayoutRegistryPort,
  type WorkingCopyPort,
  type GraphChangePort,
  type ResilienceEnginePort,
  noopFileSystem,
  noopWorkspace,
  noopLogger,
  noopLayoutRegistry,
  noopWorkingCopy,
  noopGraphChange,
  noopResilienceEngine,
} from '../../../core';
import { loadWorkspaceFromCatalog, loadWorkspaceFromDirectory } from './ioState/openWorkspace';
import { selectBundledSampleEntryPath } from '../samplesWorkspace';
import { scheduleBundledBlueprintPreload } from '../../../infrastructure/fileSystem/bundledSampleWorkspace';
import { loadSampleWorkspaceSession } from '../../../infrastructure/fileSystem/sampleWorkspaceLoader';
import { SANDBOX_LOADING_MESSAGE } from '../diagramLoadSession';

export interface IoState {
  fileSystemPort: FileSystemPort;
  workspacePort: WorkspacePort;
  /** Folder-picker workspace adapter (browser FS access). */
  folderWorkspacePort: WorkspacePort;
  /** Bundled demo blueprints adapter. */
  sampleWorkspacePort: WorkspacePort;
  logger: LoggerPort;
  layoutRegistry: LayoutRegistryPort;
  workingCopyPort: WorkingCopyPort;
  graphChangePort: GraphChangePort;
  resilienceEnginePort: ResilienceEnginePort;
  setPorts: (
    ports: Partial<{
      fileSystemPort: FileSystemPort;
      workspacePort: WorkspacePort;
      folderWorkspacePort: WorkspacePort;
      sampleWorkspacePort: WorkspacePort;
      logger: LoggerPort;
      layoutRegistry: LayoutRegistryPort;
      workingCopyPort: WorkingCopyPort;
      graphChangePort: GraphChangePort;
      resilienceEnginePort: ResilienceEnginePort;
    }>
  ) => void;

  saveSchema: () => Promise<boolean>;
  loadSchema: () => Promise<boolean>;
  openWorkspaceDirectory: () => Promise<boolean>;
  openBundledSample: () => Promise<boolean>;
  saveActiveDiagram: () => Promise<boolean>;
  clearWorkspaceDrafts: () => Promise<void>;
}

type IoStateDeps = IoState & DiagramState & UiState;

export const createIoState = (set: any, get: () => IoStateDeps): IoState => ({
  fileSystemPort: noopFileSystem,
  workspacePort: noopWorkspace,
  folderWorkspacePort: noopWorkspace,
  sampleWorkspacePort: noopWorkspace,
  logger: noopLogger,
  layoutRegistry: noopLayoutRegistry,
  workingCopyPort: noopWorkingCopy,
  graphChangePort: noopGraphChange,
  resilienceEnginePort: noopResilienceEngine,
  setPorts: ports => set((state: IoStateDeps) => ({ ...state, ...ports })),

  saveSchema: async () => {
    const { yamlCode, schema, fileSystemPort, logger, setNotification } = get();
    const sanitizedName = schema.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const start = performance.now();
    logger.info('Initiating schema file write', { file: `${sanitizedName}.yaml` });

    try {
      const success = await fileSystemPort.saveSchema(
        yamlCode,
        `${sanitizedName || 'blueprint'}.yaml`
      );
      const duration = performance.now() - start;
      if (success) {
        logger.info('Schema file written successfully', { durationMs: Math.round(duration) });
        setNotification?.({
          type: 'success',
          title: 'Schema Saved',
          message: `Successfully downloaded ${sanitizedName || 'blueprint'}.yaml`,
        });
      } else {
        logger.warn('Schema file write cancelled or failed', {
          durationMs: Math.round(duration),
        });
      }
      return success;
    } catch (err) {
      logger.error('Failed to save schema file', err);
      setNotification?.({
        type: 'error',
        title: 'Save Error',
        message: (err as Error).message || 'Error occurred while saving schema.',
      });
      return false;
    }
  },

  loadSchema: async () => {
    const { fileSystemPort, importYaml, logger, setNotification, setIsLoading } = get();
    const start = performance.now();
    logger.info('Opening file dialog for schema load');
    setIsLoading(true);

    try {
      const content = await fileSystemPort.loadSchema();
      const duration = performance.now() - start;
      if (content) {
        const success = importYaml(content);
        logger.info('Schema file loaded and parsed', {
          durationMs: Math.round(duration),
          success,
        });
        if (success) {
          setNotification?.({
            type: 'success',
            title: 'Schema Loaded',
            message: 'Successfully loaded and parsed schema from file.',
          });
        }
        return success;
      }
      logger.info('Schema load cancelled by user', { durationMs: Math.round(duration) });
      return false;
    } catch (err) {
      logger.error('Failed to load schema file', err);
      setNotification?.({
        type: 'error',
        title: 'Save Error',
        message: (err as Error).message || 'Error occurred while loading schema.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  },

  openWorkspaceDirectory: async () => {
    const {
      workspacePort,
      folderWorkspacePort,
      workingCopyPort,
      logger,
      setNotification,
      initSchema,
      setIsLoading,
      isSampleWorkspace,
    } = get();
    setIsLoading(true);
    try {
      const port = isSampleWorkspace ? folderWorkspacePort : workspacePort;
      set({ workspacePort: port, isSampleWorkspace: false });
      return await loadWorkspaceFromDirectory({
        selectDirectory: () => port.selectDirectory(),
        readDirectoryFiles: () => port.readDirectoryFiles(),
        getDirectoryName: () => port.getDirectoryName(),
        workingCopy: workingCopyPort,
        logger,
        setNotification,
        initSchema,
        set,
        isSampleWorkspace: false,
      });
    } catch (err) {
      logger.error('Failed to open workspace directory', err);
      set({ lastError: (err as Error).message || 'Failed to open workspace directory' });
      return false;
    } finally {
      setIsLoading(false);
    }
  },

  openBundledSample: async () => {
    const { workingCopyPort, logger, setNotification, initSchema, setIsLoading } = get();
    setIsLoading(SANDBOX_LOADING_MESSAGE);
    try {
      const session = await loadSampleWorkspaceSession();
      set({
        workspacePort: session.workspacePort,
        sampleWorkspacePort: session.workspacePort,
        isSampleWorkspace: true,
      });
      const catalog = session.catalog;
      const entryPath = selectBundledSampleEntryPath(catalog);
      const opened = await loadWorkspaceFromCatalog({
        catalog,
        entryPath,
        readFile: relativePath => session.workspacePort.readFile(relativePath),
        getDirectoryName: () => session.workspacePort.getDirectoryName(),
        workingCopy: workingCopyPort,
        logger,
        setNotification,
        initSchema,
        set,
        isSampleWorkspace: true,
      });
      if (opened) {
        // Full peer list stays in catalog; warm ArchLens context + golden/stress YAML.
        scheduleBundledBlueprintPreload(catalog);
      }
      return opened;
    } catch (err) {
      logger.error('Failed to open bundled sample workspace', err);
      set({ lastError: (err as Error).message || 'Failed to open bundled sample workspace' });
      return false;
    } finally {
      setIsLoading(false);
    }
  },

  clearWorkspaceDrafts: async () => {
    const { workingCopyPort, logger } = get();
    try {
      await workingCopyPort.clearAllDrafts();
    } catch (err) {
      logger.error('Failed to purge working-copy drafts', err);
    }
  },

  saveActiveDiagram: async () => {
    const {
      yamlCode,
      schema,
      nodeRefMap,
      currentFilePath,
      workspacePort,
      workingCopyPort,
      isWorkspaceOpen,
      isSampleWorkspace,
      logger,
      setNotification,
    } = get();
    if (!isWorkspaceOpen || isSampleWorkspace) {
      return get().saveSchema();
    }

    logger.info('Saving active diagram directly to workspace', { path: currentFilePath });
    try {
      const success = await workspacePort.writeFile(currentFilePath, yamlCode);
      if (success) {
        logger.info('Diagram saved successfully');
        const sysId = schema.entityRef || 'default';
        const fileRefMap = nodeRefMap[currentFilePath] || {};
        await workingCopyPort.saveBaselineSchema({
          filePath: currentFilePath,
          schema,
          systemId: sysId,
          nodeRefMap: fileRefMap,
        });
        get().checkPendingChanges?.();
        setNotification?.({
          type: 'success',
          title: 'Save Successful',
          message: `Saved active diagram to ${currentFilePath.split('/').pop()}`,
        });
      } else {
        logger.error('Failed to save diagram');
        setNotification?.({
          type: 'error',
          title: 'Save Failed',
          message: 'Failed to write active diagram to disk.',
        });
      }
      return success;
    } catch (err) {
      logger.error('Error saving diagram in workspace', err);
      setNotification?.({
        type: 'error',
        title: 'Save Error',
        message: (err as Error).message || 'Error occurred while saving diagram.',
      });
      return false;
    }
  },
});
