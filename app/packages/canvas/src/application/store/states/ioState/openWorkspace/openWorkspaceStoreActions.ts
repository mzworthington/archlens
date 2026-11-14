import { selectBundledSampleEntryPath } from '../../../samplesWorkspace';
import { scheduleBundledBlueprintPreload } from '../../../../../infrastructure/fileSystem/bundledSampleWorkspace';
import {
  getLoadedRemoteCatalogIdentity,
  invalidateRemoteCatalogCache,
} from '../../../../../infrastructure/fileSystem/remoteCatalogWorkspace';
import { loadSampleWorkspaceSession } from '../../../../../infrastructure/fileSystem/sampleWorkspaceLoader';
import { runRemoteCatalogRefresh } from '../../../../catalog/remoteCatalogRefresh';
import { clearSessionLayout } from '../../../sessionLayoutCache';
import { SANDBOX_LOADING_MESSAGE } from '../../../diagramLoadSession';
import { beginWorkspaceOpen, isWorkspaceOpenCurrent } from '../../../workspaceOpenSession';
import type { BlueprintStoreSet } from '../../../store';
import type { DiagramState } from '../../diagramState';
import type { UiState } from '../../uiState';
import type { IoState } from '../../ioState';
import { loadWorkspaceFromCatalog, loadWorkspaceFromDirectory } from '.';
import { createBrowserScanStoreActions } from './browserScanStoreActions';

type IoGet = () => IoState & DiagramState & UiState;

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
          title: 'Load Error',
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
          usesRemoteCatalog: session.usesRemoteCatalog,
          remoteCatalogRevision: session.usesRemoteCatalog
            ? (getLoadedRemoteCatalogIdentity()?.revision ?? null)
            : null,
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

    refreshRemoteCatalog: async (confirmed = false) => {
      const { hasPendingChanges, currentFilePath, workingCopyPort, setNotification } = get();
      const result = await runRemoteCatalogRefresh({
        hasPendingChanges,
        confirmed,
        currentFilePath,
        clearDrafts: () => workingCopyPort.clearAllDrafts(),
        clearSessionLayout: () => clearSessionLayout(),
        invalidateCache: invalidateRemoteCatalogCache,
        loadSession: loadSampleWorkspaceSession,
        readLoadedRevision: () => getLoadedRemoteCatalogIdentity()?.revision ?? null,
        selectEntryPath: selectBundledSampleEntryPath,
        openCatalog: async (session, entryPath) => {
          const {
            workingCopyPort: workingCopy,
            logger,
            setNotification: notify,
            initSchema,
            setIsLoading,
          } = get();
          const openGeneration = beginWorkspaceOpen();
          setIsLoading(SANDBOX_LOADING_MESSAGE);
          try {
            return await loadWorkspaceFromCatalog({
              catalog: session.catalog,
              entryPath,
              readFile: relativePath => session.workspacePort.readFile(relativePath),
              getDirectoryName: () => session.workspacePort.getDirectoryName(),
              workingCopy,
              logger,
              setNotification: notify,
              initSchema,
              set,
              isSampleWorkspace: true,
              usesRemoteCatalog: true,
              remoteCatalogRevision: getLoadedRemoteCatalogIdentity()?.revision ?? null,
              openGeneration,
              committedPorts: {
                workspacePort: session.workspacePort,
                sampleWorkspacePort: session.workspacePort,
              },
            });
          } finally {
            setIsLoading(false);
          }
        },
      });
      if (result === 'refreshed') {
        await get().checkPendingChanges();
      }
      if (result === 'failed') {
        setNotification({
          type: 'error',
          title: 'Catalog refresh failed',
          message:
            'The newer snapshot could not be loaded. This canvas still shows the previous one.',
        });
      }
      return result;
    },

    ...createBrowserScanStoreActions(set, get),
  };
}
