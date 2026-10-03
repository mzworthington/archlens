import { isCancellationError } from '@archlens/analysis/cancellation';
import { selectBundledSampleEntryPath } from '../../../samplesWorkspace';
import { scheduleBundledBlueprintPreload } from '../../../../../infrastructure/fileSystem/bundledSampleWorkspace';
import { loadSampleWorkspaceSession } from '../../../../../infrastructure/fileSystem/sampleWorkspaceLoader';
import { SANDBOX_LOADING_MESSAGE } from '../../../diagramLoadSession';
import {
  beginWorkspaceOpen,
  clearFolderWorkspacePreferred,
  isWorkspaceOpenCurrent,
  markFolderWorkspacePreferred,
  releaseDemoBootstrapClaim,
} from '../../../workspaceOpenSession';
import {
  describeTruncation,
  pickSourceDirectory,
  walkBrowserSourceDirectory,
} from '../../../../../infrastructure/analysis/browserSourceWalker';
import {
  pickZipArchive,
  walkZipArchive,
} from '../../../../../infrastructure/analysis/zipSourceWalker';
import { createMemoryScanWorkspacePort } from '../../../../../infrastructure/analysis/memoryScanWorkspace';
import { createAnalysisLogger } from '../../../../../infrastructure/analysis/analysisLogger';
import { runBrowserAnalysisWorker } from '../../../../../infrastructure/analysis/runBrowserAnalysisWorker';
import type { LiteScanProgress } from '../../../../analysis/liteScanProgress';
import {
  LITE_SCAN_MAX_FILE_BYTES,
  LITE_SCAN_MAX_FILES,
  LITE_SCAN_MAX_METADATA_FILES,
  LITE_SCAN_MAX_TOTAL_BYTES,
} from '../../../../analysis/liteScanLimits';
import {
  IN_TAB_CLI_MAX_FILE_BYTES,
  IN_TAB_CLI_MAX_FILES,
  IN_TAB_CLI_MAX_METADATA_FILES,
  IN_TAB_CLI_MAX_TOTAL_BYTES,
} from '../../../../analysis/inTabCliLimits';
import { createInTabCliSandbox, type InTabCliSandbox } from '../../../../analysis/inTabCliSandbox';
import { CLI_INSTALL_COMMAND, CLI_SCAN_COMMAND } from '../../../../../constants/cli';
import { browserScanReadyMessage } from '../../../../forensics/traceLensBrowserScanCopy';
import {
  downloadScanYamlFileName,
  writeWorkspaceYamlFiles,
} from '../../../../workspace/writeWorkspaceYamlFiles';
import type { BlueprintStoreSet } from '../../../store';
import type { DiagramState } from '../../diagramState';
import type { UiState } from '../../uiState';
import type { IoState } from '../../ioState';
import {
  loadWorkspaceFromCatalog,
  loadWorkspaceFromDirectory,
  loadWorkspaceFromYamlFiles,
} from '.';

type IoGet = () => IoState & DiagramState & UiState;

const BROWSER_LITE_SCAN_LOADING_MESSAGE = 'Scanning repository in browser…';
const IN_TAB_CLI_LOADING_MESSAGE = 'Running sandboxed CLI scan…';

let browserLiteScanController: AbortController | null = null;
let browserLitePersistInFlight = false;
let inTabCliSandbox: InTabCliSandbox | null = null;
let scanKind: 'lite' | 'in-tab-cli' = 'lite';

export function createOpenWorkspaceStoreActions(set: BlueprintStoreSet, get: IoGet) {
  return {
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
      inTabCliSandbox?.stop();
      browserLiteScanController?.abort();
    },

    stopInTabCliSession: () => {
      inTabCliSandbox?.stop();
      browserLiteScanController?.abort();
    },

    openInTabCliScan: async () => {
      scanKind = 'in-tab-cli';
      try {
        return await get().openBrowserLiteScan();
      } finally {
        scanKind = 'lite';
      }
    },

    openBrowserLiteScan: async (source?: { zipFile?: File }) => {
      const kind = scanKind;
      const inTab = kind === 'in-tab-cli';
      const maxFiles = inTab ? IN_TAB_CLI_MAX_FILES : LITE_SCAN_MAX_FILES;
      const maxFileBytes = inTab ? IN_TAB_CLI_MAX_FILE_BYTES : LITE_SCAN_MAX_FILE_BYTES;
      const maxTotalBytes = inTab ? IN_TAB_CLI_MAX_TOTAL_BYTES : LITE_SCAN_MAX_TOTAL_BYTES;
      const maxMetadataFiles = inTab ? IN_TAB_CLI_MAX_METADATA_FILES : LITE_SCAN_MAX_METADATA_FILES;
      const loadingMessage = inTab ? IN_TAB_CLI_LOADING_MESSAGE : BROWSER_LITE_SCAN_LOADING_MESSAGE;
      const readyTitle = inTab ? 'In-tab scan ready' : 'Browser scan ready';
      const { workingCopyPort, logger, setNotification, initSchema, setIsLoading } = get();
      let zipFile = source?.zipFile;
      let directoryHandle: FileSystemDirectoryHandle | null = null;

      if (!zipFile) {
        const pick = await pickSourceDirectory();
        if (pick.status === 'cancelled') return inTab ? true : false;
        if (inTab && pick.status === 'unsupported') {
          setNotification?.({
            type: 'error',
            title: 'In-tab scan unavailable',
            message:
              'This browser cannot pick a folder. Use browser lite scan with a ZIP, or install the ArchLens CLI.',
          });
          return false;
        }
        if (pick.status === 'ok') {
          directoryHandle = pick.handle;
        } else {
          const zipPick = await pickZipArchive();
          if (zipPick.status === 'cancelled') {
            setNotification?.({
              type: 'error',
              title: 'Scan cancelled',
              message:
                'Upload a ZIP of the repo to try again, or install the ArchLens CLI for a full scan.',
            });
            return false;
          }
          zipFile = zipPick.file;
        }
      }

      const openGeneration = beginWorkspaceOpen();
      setIsLoading(loadingMessage);
      const cancellation = new AbortController();
      browserLiteScanController = cancellation;
      const sandbox = inTab ? createInTabCliSandbox(() => cancellation.abort()) : null;
      if (sandbox) inTabCliSandbox = sandbox;
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
        const walkLimits = { maxFiles, maxFileBytes, maxTotalBytes, maxMetadataFiles };
        const walked = zipFile
          ? await walkZipArchive(zipFile, {
              signal: cancellation.signal,
              onProgress: reportProgress,
              ...walkLimits,
            })
          : await walkBrowserSourceDirectory(directoryHandle!, {
              signal: cancellation.signal,
              onProgress: reportProgress,
              ...walkLimits,
            });
        sandbox?.holdSources(walked.files);
        if (abortIfSuperseded()) return false;
        if (walked.sourceFileCount === 0 && walked.iacFileCount === 0) {
          throw new Error(
            'No supported source or IaC files found (try .ts/.tsx/.js/.jsx/.mjs/.cjs/.py/.go/.java/.cs, or Terraform .tf / Pulumi.yaml).'
          );
        }

        reportProgress({
          phase: 'analyzing',
          filesScanned: walked.sourceFileCount + walked.iacFileCount,
          fileCap: maxFiles,
          bytesRead: get().liteScanProgress?.bytesRead ?? 0,
          byteCap: maxTotalBytes,
        });

        const { yamlFiles, gitStatus } = await runBrowserAnalysisWorker({
          sources: walked.files,
          directoryName: walked.directoryName,
          rootHandle: directoryHandle ?? undefined,
          logger: createAnalysisLogger(logger),
          signal: cancellation.signal,
          onWorker: worker => sandbox?.attachWorker(worker),
        });
        if (abortIfSuperseded()) return false;

        if (yamlFiles.length === 0) {
          throw new Error(
            'Scan produced no BlueprintSpec YAML - check the selected folder or ZIP.'
          );
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
          browserScanGit: gitStatus,
          openGeneration,
          committedPorts: { workspacePort: scanPort },
        });

        if (opened) {
          markFolderWorkspacePreferred();
          set({ isMemoryScanWorkspace: true, isScanMapPersistOpen: true });
          const truncatedNote = describeTruncation(
            walked.truncationReasons,
            walked.sourceFileCount
          );
          setNotification?.({
            type: 'info',
            title: readyTitle,
            message: browserScanReadyMessage({
              sourceFileCount: walked.sourceFileCount,
              iacFileCount: walked.iacFileCount,
              truncatedNote,
              gitStatus,
            }),
            actions: [
              {
                label: 'Copy install command',
                onClick: () => {
                  void navigator.clipboard.writeText(CLI_INSTALL_COMMAND);
                },
              },
              {
                label: 'Copy scan command',
                onClick: () => {
                  void navigator.clipboard.writeText(CLI_SCAN_COMMAND);
                },
              },
            ],
          });
          return true;
        }

        restoreDemoBootstrapIfNeeded();
        return false;
      } catch (err) {
        if (isCancellationError(err)) {
          logger.info(inTab ? 'In-tab CLI scan stopped' : 'Browser lite scan cancelled');
          restoreDemoBootstrapIfNeeded();
          return inTab ? true : false;
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
        sandbox?.stop();
        if (inTabCliSandbox === sandbox) inTabCliSandbox = null;
        if (browserLiteScanController === cancellation) {
          browserLiteScanController = null;
        }
        cancellation.abort();
        set({ liteScanProgress: null });
        setIsLoading(false);
      }
    },

    persistBrowserScanMapToFolder: async () => {
      const {
        workspacePort,
        folderWorkspacePort,
        isMemoryScanWorkspace,
        logger,
        setNotification,
        setIsLoading,
      } = get();
      if (!isMemoryScanWorkspace || browserLitePersistInFlight) return false;
      browserLitePersistInFlight = true;
      setIsLoading(true);
      try {
        const files = await workspacePort.readDirectoryFiles();
        const selected = await folderWorkspacePort.selectDirectory();
        if (!selected) return false;
        const written = await writeWorkspaceYamlFiles(folderWorkspacePort, files);
        if (!written.ok) {
          setNotification?.({
            type: 'error',
            title: 'Save failed',
            message: `Could not write ${written.failedPath} into that folder.`,
          });
          return false;
        }
        set({
          workspacePort: folderWorkspacePort,
          isMemoryScanWorkspace: false,
          isScanMapPersistOpen: false,
        });
        setNotification?.({
          type: 'success',
          title: 'Map saved',
          message: `Wrote ${files.length} blueprint file(s) to ${folderWorkspacePort.getDirectoryName()}. Later edits use draft and commit like other folders.`,
        });
        return true;
      } catch (err) {
        logger.error('Failed to save browser scan map to a folder', err);
        setNotification?.({
          type: 'error',
          title: 'Save failed',
          message: (err as Error).message || 'Could not save the map into a folder.',
        });
        return false;
      } finally {
        browserLitePersistInFlight = false;
        setIsLoading(false);
      }
    },

    persistBrowserScanMapDownload: async () => {
      const { workspacePort, fileSystemPort, isMemoryScanWorkspace, logger, setNotification } =
        get();
      if (!isMemoryScanWorkspace) return false;
      try {
        const files = await workspacePort.readDirectoryFiles();
        for (const file of files) {
          const saved = await fileSystemPort.saveSchema(
            file.content,
            downloadScanYamlFileName(file.name)
          );
          if (!saved) return false;
        }
        set({ isScanMapPersistOpen: false });
        setNotification?.({
          type: 'success',
          title: 'Map downloaded',
          message: `Downloaded ${files.length} blueprint file(s). The canvas copy stays in memory until you save to a folder.`,
        });
        return true;
      } catch (err) {
        logger.error('Failed to download browser scan map', err);
        setNotification?.({
          type: 'error',
          title: 'Download failed',
          message: (err as Error).message || 'Could not download the map.',
        });
        return false;
      }
    },

    dismissScanMapPersist: () => {
      set({ isScanMapPersistOpen: false });
    },
  };
}
