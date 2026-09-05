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
  type CollabSessionPort,
  type CollabPresence,
  noopFileSystem,
  noopWorkspace,
  noopLogger,
  noopLayoutRegistry,
  noopWorkingCopy,
  noopGraphChange,
  noopResilienceEngine,
  noopCollabSession,
  EMPTY_COLLAB_PRESENCE,
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
  clearFolderWorkspacePreferred,
  isWorkspaceOpenCurrent,
  markFolderWorkspacePreferred,
  releaseDemoBootstrapClaim,
} from '../workspaceOpenSession';
import {
  describeTruncation,
  pickSourceDirectory,
  walkBrowserSourceDirectory,
} from '../../../infrastructure/analysis/browserSourceWalker';
import { createMemoryScanWorkspacePort } from '../../../infrastructure/analysis/memoryScanWorkspace';
import { createAnalysisLogger } from '../../../infrastructure/analysis/analysisLogger';
import { runBrowserAnalysisWorker } from '../../../infrastructure/analysis/runBrowserAnalysisWorker';
import { isCancellationError } from '@archlens/analysis/cancellation';
import type { LiteScanProgress } from '../../analysis/liteScanProgress';
import { LITE_SCAN_MAX_FILES, LITE_SCAN_MAX_TOTAL_BYTES } from '../../analysis/liteScanLimits';
import { CLI_GETTING_STARTED_PATH } from '../../../constants/cli';
import { setCollabDisplayName as persistCollabDisplayName } from '../../collab/collabDisplayName';
import { readCollabHostToken } from '../../collab/collabRoomCredentials';
import { yamlFileNameFromDiagramName } from './ioState/yamlFileNameFromDiagramName';
import { persistBlankCanvasSessionFromSchema } from './ioState/blankCanvasSession';
import type { BlueprintStoreSet } from '../store';

const BROWSER_LITE_SCAN_LOADING_MESSAGE = 'Scanning repository in browser…';

let browserLiteScanController: AbortController | null = null;

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
  collabSessionPort: CollabSessionPort;
  collabPresence: CollabPresence;
  /** Set when a protected room rejects the guest. */
  collabJoinError: string | null;
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
      collabSessionPort: CollabSessionPort;
    }>
  ) => void;

  saveSchema: () => Promise<boolean>;
  saveBlankCanvasToFolder: () => Promise<boolean>;
  loadSchema: () => Promise<boolean>;
  openWorkspaceDirectory: () => Promise<boolean>;
  openBundledSample: () => Promise<boolean>;
  /** Structural TS/JS scan in the browser (no git / CLI install). */
  openBrowserLiteScan: () => Promise<boolean>;
  /** Live files/bytes while a browser lite scan is in flight. */
  liteScanProgress: LiteScanProgress | null;
  /** Abort the in-flight browser lite scan (chooser or toolbar). */
  cancelBrowserLiteScan: () => void;
  saveActiveDiagram: () => Promise<boolean>;
  clearWorkspaceDrafts: () => Promise<void>;
  joinCollabRoom: (
    roomId: string,
    displayName: string,
    credentials?: {
      hostToken?: string;
      secret?: string;
      claim?: {
        access: 'open' | 'secret';
        secret?: string;
        expiresAtMs?: number;
      };
    }
  ) => Promise<void>;
  endCollabRoom: () => void;
  leaveCollabRoom: () => void;
  setCollabCursor: (position: { x: number; y: number } | null) => void;
  updateCollabDisplayName: (name: string) => boolean;
}

type IoStateDeps = IoState & DiagramState & UiState;

export const createIoState = (set: BlueprintStoreSet, get: () => IoStateDeps): IoState => ({
  fileSystemPort: noopFileSystem,
  workspacePort: noopWorkspace,
  folderWorkspacePort: noopWorkspace,
  sampleWorkspacePort: noopWorkspace,
  logger: noopLogger,
  layoutRegistry: noopLayoutRegistry,
  workingCopyPort: noopWorkingCopy,
  graphChangePort: noopGraphChange,
  resilienceEnginePort: noopResilienceEngine,
  collabSessionPort: noopCollabSession,
  collabPresence: EMPTY_COLLAB_PRESENCE,
  collabJoinError: null,
  liteScanProgress: null,
  setPorts: ports => set((state: IoStateDeps) => ({ ...state, ...ports })),

  saveSchema: async () => {
    const {
      yamlCode,
      schema,
      fileSystemPort,
      logger,
      setNotification,
      importYaml,
      isWorkspaceOpen,
    } = get();
    const fileName = yamlFileNameFromDiagramName(schema.name);
    const start = performance.now();
    logger.info('Initiating schema file write', { file: fileName });

    try {
      const saved = await fileSystemPort.saveSchema(yamlCode, fileName);
      const duration = performance.now() - start;
      if (saved) {
        logger.info('Schema file written successfully', { durationMs: Math.round(duration) });
        if (!isWorkspaceOpen) {
          const reloaded = importYaml(saved.content);
          if (reloaded) {
            set({ currentFilePath: saved.fileName });
            persistBlankCanvasSessionFromSchema(saved.fileName, get().schema, 'file');
          }
        }
        setNotification?.({
          type: 'success',
          title: 'Schema Saved',
          message: `Successfully saved ${saved.fileName}`,
        });
      } else {
        logger.warn('Schema file write cancelled or failed', {
          durationMs: Math.round(duration),
        });
      }
      return Boolean(saved);
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

  saveBlankCanvasToFolder: async () => {
    const {
      yamlCode,
      schema,
      workspacePort,
      workingCopyPort,
      logger,
      setNotification,
      initSchema,
      setIsLoading,
    } = get();
    const fileName = yamlFileNameFromDiagramName(schema.name);
    setIsLoading(true);
    try {
      const selected = await workspacePort.selectDirectory();
      if (!selected) return false;
      const written = await workspacePort.writeFile(fileName, yamlCode);
      if (!written) {
        setNotification?.({
          type: 'error',
          title: 'Save failed',
          message: 'Could not write the diagram into that folder.',
        });
        return false;
      }
      const files = await workspacePort.readDirectoryFiles();
      const opened = await loadWorkspaceFromYamlFiles({
        files,
        workspaceName: workspacePort.getDirectoryName(),
        workingCopy: workingCopyPort,
        logger,
        setNotification,
        initSchema,
        set,
        isSampleWorkspace: false,
        preferredEntryPath: fileName,
        committedPorts: { workspacePort },
      });
      if (opened) {
        persistBlankCanvasSessionFromSchema(fileName, get().schema, 'folder');
      }
      return opened;
    } catch (err) {
      logger.error('Failed to save blank canvas into a folder', err);
      setNotification?.({
        type: 'error',
        title: 'Save failed',
        message: (err as Error).message || 'Could not save the diagram into a folder.',
      });
      return false;
    } finally {
      setIsLoading(false);
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

  cancelBrowserLiteScan: () => {
    browserLiteScanController?.abort();
  },

  openBrowserLiteScan: async () => {
    const { workingCopyPort, logger, setNotification, initSchema, setIsLoading } = get();
    const pick = await pickSourceDirectory();
    if (pick.status === 'cancelled') return false;
    if (pick.status === 'unsupported') {
      setNotification?.({
        type: 'error',
        title: 'Browser lite scan unavailable',
        message:
          'This browser cannot pick a local folder (Firefox and Safari lack the File System Access API). Use Chrome or Edge, or install the ArchLens CLI for a full scan.',
        actions: [
          {
            label: 'Install guide',
            onClick: () => {
              window.location.assign(CLI_GETTING_STARTED_PATH);
            },
          },
        ],
      });
      return false;
    }

    const openGeneration = beginWorkspaceOpen();
    setIsLoading(BROWSER_LITE_SCAN_LOADING_MESSAGE);
    const cancellation = new AbortController();
    browserLiteScanController = cancellation;
    const abortIfSuperseded = () => {
      if (isWorkspaceOpenCurrent(openGeneration)) return false;
      cancellation.abort();
      return true;
    };

    const restoreDemoBootstrapIfNeeded = () => {
      if (get().isWorkspaceOpen) return;
      clearFolderWorkspacePreferred();
      releaseDemoBootstrapClaim();
    };

    const reportProgress = (progress: LiteScanProgress) => {
      if (!isWorkspaceOpenCurrent(openGeneration)) return;
      set({ liteScanProgress: progress });
    };

    try {
      const walked = await walkBrowserSourceDirectory(pick.handle, {
        signal: cancellation.signal,
        onProgress: reportProgress,
      });
      if (abortIfSuperseded()) return false;
      if (walked.sourceFileCount === 0 && walked.iacFileCount === 0) {
        throw new Error(
          'No supported source or IaC files found (try .ts/.tsx/.js/.jsx/.mjs/.cjs/.py/.go/.java/.cs, or Terraform .tf / Pulumi.yaml).'
        );
      }

      reportProgress({
        phase: 'analyzing',
        filesScanned: walked.sourceFileCount + walked.iacFileCount,
        fileCap: LITE_SCAN_MAX_FILES,
        bytesRead: get().liteScanProgress?.bytesRead ?? 0,
        byteCap: LITE_SCAN_MAX_TOTAL_BYTES,
      });

      const { yamlFiles } = await runBrowserAnalysisWorker({
        sources: walked.files,
        directoryName: walked.directoryName,
        logger: createAnalysisLogger(logger),
        signal: cancellation.signal,
      });
      if (abortIfSuperseded()) return false;

      if (yamlFiles.length === 0) {
        throw new Error('Scan produced no BlueprintSpec YAML - check the selected folder.');
      }

      const scanPort = createMemoryScanWorkspacePort({
        directoryName: walked.directoryName,
        files: yamlFiles,
      });

      const preferredEntryPath =
        yamlFiles.find(f => f.name.endsWith('context.yaml'))?.name ?? yamlFiles[0]!.name;

      const opened = await loadWorkspaceFromYamlFiles({
        files: yamlFiles,
        workspaceName: walked.directoryName,
        preferredEntryPath,
        workingCopy: workingCopyPort,
        logger,
        setNotification,
        initSchema,
        set,
        isSampleWorkspace: false,
        isBrowserLiteWorkspace: true,
        openGeneration,
        committedPorts: { workspacePort: scanPort, folderWorkspacePort: scanPort },
      });

      if (opened) {
        // Only lock out demo bootstrap after a successful scan workspace open.
        markFolderWorkspacePreferred();
        const truncatedNote = describeTruncation(walked.truncationReasons, walked.sourceFileCount);
        setNotification?.({
          type: 'info',
          title: 'Browser lite scan ready',
          message: `Loaded ${walked.sourceFileCount} source file(s)${
            walked.iacFileCount > 0 ? ` and ${walked.iacFileCount} IaC file(s)` : ''
          } - structure only (no TraceLens/git hotspots).${truncatedNote} In-memory until you export. Install the ArchLens CLI for forensics, watch mode and CI publish.`,
        });
        return true;
      }

      restoreDemoBootstrapIfNeeded();
      return false;
    } catch (err) {
      if (isCancellationError(err)) {
        logger.info('Browser lite scan cancelled');
        restoreDemoBootstrapIfNeeded();
        return false;
      }
      logger.error('Failed to run browser lite scan', err);
      restoreDemoBootstrapIfNeeded();
      set({ lastError: (err as Error).message || 'Failed to scan repository in browser' });
      setNotification?.({
        type: 'error',
        title: 'Browser scan failed',
        message: (err as Error).message || 'Failed to scan repository in browser',
      });
      return false;
    } finally {
      if (browserLiteScanController === cancellation) {
        browserLiteScanController = null;
      }
      cancellation.abort();
      set({ liteScanProgress: null });
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

  joinCollabRoom: async (roomId, displayName, credentials) => {
    const { collabSessionPort, schema, applyRemoteCollabSchema, logger, setNotification } = get();
    try {
      set({ collabJoinError: null });
      await collabSessionPort.join({
        roomId,
        seedSchema: schema,
        displayName,
        credentials,
        onSchema: applyRemoteCollabSchema,
        onPresence: presence => set({ collabPresence: presence }),
        onRoomControl: event => {
          if (event === 'admitted') {
            set({ collabJoinError: null });
            return;
          }
          if (event === 'need-secret') {
            set({
              collabJoinError: 'This room needs a secret before the diagram is shown.',
            });
            return;
          }
          if (event === 'denied') {
            set({
              collabJoinError: 'That secret does not match. The diagram is still hidden.',
            });
            return;
          }
          if (event === 'ended') {
            setNotification?.({
              type: 'info',
              title: 'Live session ended',
              message: 'The host closed this room. New joins will not work.',
            });
            get().leaveCollabRoom();
          }
        },
      });
    } catch (err) {
      logger.error('Failed to join collab room', err);
    }
  },

  endCollabRoom: () => {
    const { collabSessionPort } = get();
    const roomId = collabSessionPort.roomId();
    const hostToken = roomId ? readCollabHostToken(roomId) : null;
    collabSessionPort.endRoom(hostToken);
  },

  leaveCollabRoom: () => {
    get().collabSessionPort.leave();
    set({ collabPresence: EMPTY_COLLAB_PRESENCE, collabJoinError: null });
  },

  setCollabCursor: (position: { x: number; y: number } | null) => {
    get().collabSessionPort.setCursor(position);
  },

  updateCollabDisplayName: (raw: string) => {
    const name = persistCollabDisplayName(raw);
    if (!name) return false;
    get().collabSessionPort.setDisplayName(name);
    return true;
  },
});
