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
import {
  loadWorkspaceFromCatalog,
  loadWorkspaceFromDirectory,
  loadWorkspaceFromYamlFiles,
} from './ioState/openWorkspace';
import { selectBundledSampleEntryPath } from '../samplesWorkspace';
import { scheduleBundledBlueprintPreload } from '../../../infrastructure/fileSystem/bundledSampleWorkspace';
import { loadSampleWorkspaceSession } from '../../../infrastructure/fileSystem/sampleWorkspaceLoader';
import { SANDBOX_LOADING_MESSAGE } from '../diagramLoadSession';
import {
  beginWorkspaceOpen,
  isWorkspaceOpenCurrent,
  markFolderWorkspacePreferred,
} from '../workspaceOpenSession';
import { buildLiteScanSchemas } from '../../analysis/buildLiteScanSchemas';
import {
  pickSourceDirectory,
  walkBrowserSourceDirectory,
} from '../../../infrastructure/analysis/browserSourceWalker';
import { createMemoryScanWorkspacePort } from '../../../infrastructure/analysis/memoryScanWorkspace';

export const BROWSER_LITE_SCAN_LOADING_MESSAGE = 'Scanning repository in browser…';

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
  /** Structural TS/JS scan in the browser (no git / CLI install). */
  openBrowserLiteScan: () => Promise<boolean>;
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
      return await loadWorkspaceFromDirectory({
        selectDirectory: () => port.selectDirectory(),
        readDirectoryFiles: () => port.readDirectoryFiles(),
        getDirectoryName: () => port.getDirectoryName(),
        committedPorts: { workspacePort: port },
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
    const openGeneration = beginWorkspaceOpen();
    setIsLoading(SANDBOX_LOADING_MESSAGE);
    try {
      const session = await loadSampleWorkspaceSession();
      if (!isWorkspaceOpenCurrent(openGeneration)) return false;

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
        openGeneration,
        committedPorts: {
          workspacePort: session.workspacePort,
          sampleWorkspacePort: session.workspacePort,
        },
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

  openBrowserLiteScan: async () => {
    const { workingCopyPort, logger, setNotification, initSchema, setIsLoading } = get();
    const handle = await pickSourceDirectory();
    if (!handle) return false;

    markFolderWorkspacePreferred();
    const openGeneration = beginWorkspaceOpen();
    setIsLoading(BROWSER_LITE_SCAN_LOADING_MESSAGE);
    try {
      const walked = await walkBrowserSourceDirectory(handle);
      if (!isWorkspaceOpenCurrent(openGeneration)) return false;
      if (walked.files.length === 0) {
        throw new Error(
          'No TypeScript or JavaScript source files found (try a package with .ts/.tsx/.js/.jsx).'
        );
      }

      const built = buildLiteScanSchemas(walked.files, {
        workspaceName: walked.directoryName,
        truncated: walked.truncated,
      });
      const scanPort = createMemoryScanWorkspacePort({
        directoryName: walked.directoryName,
        files: built.files,
      });

      const opened = await loadWorkspaceFromYamlFiles({
        files: built.files,
        workspaceName: walked.directoryName,
        preferredEntryPath: `${built.contextEntityRef}/context.yaml`,
        workingCopy: workingCopyPort,
        logger,
        setNotification,
        initSchema,
        set,
        isSampleWorkspace: false,
        openGeneration,
        committedPorts: { workspacePort: scanPort, folderWorkspacePort: scanPort },
      });

      if (opened) {
        const truncatedNote = built.truncated
          ? ` Capped at ${built.fileCount} files for browser responsiveness.`
          : '';
        setNotification?.({
          type: 'success',
          title: 'Browser scan ready',
          message: `Loaded ${built.fileCount} source file(s) as BlueprintSpec (structure only — no git hotspots).${truncatedNote} Install the ArchLens CLI for TraceLens and CI publish.`,
        });
      }
      return opened;
    } catch (err) {
      logger.error('Failed to run browser lite scan', err);
      set({ lastError: (err as Error).message || 'Failed to scan repository in browser' });
      setNotification?.({
        type: 'error',
        title: 'Browser scan failed',
        message: (err as Error).message || 'Failed to scan repository in browser',
      });
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
