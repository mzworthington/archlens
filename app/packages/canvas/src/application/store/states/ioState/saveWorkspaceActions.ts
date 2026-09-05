import {
  downloadScanYamlFileName,
  writeWorkspaceYamlFiles,
} from '../../../workspace/writeWorkspaceYamlFiles';
import type { BlueprintStoreSet } from '../../store';
import { persistBlankCanvasSessionFromSchema } from './blankCanvasSession';
import { loadWorkspaceFromYamlFiles } from './openWorkspace';
import type { IoState, IoStateDeps } from './types';
import { yamlFileNameFromDiagramName } from './yamlFileNameFromDiagramName';

export function createSaveWorkspaceActions(
  set: BlueprintStoreSet,
  get: () => IoStateDeps
): Pick<
  IoState,
  | 'saveSchema'
  | 'saveBlankCanvasToFolder'
  | 'saveActiveDiagram'
  | 'persistBrowserScanMapToFolder'
  | 'persistBrowserScanMapDownload'
  | 'dismissScanMapPersist'
> {
  return {
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

    persistBrowserScanMapToFolder: async () => {
      const {
        workspacePort,
        folderWorkspacePort,
        isMemoryScanWorkspace,
        logger,
        setNotification,
        setIsLoading,
      } = get();
      if (!isMemoryScanWorkspace) return false;
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
        isMemoryScanWorkspace,
        logger,
        setNotification,
      } = get();
      if (isMemoryScanWorkspace) {
        set({ isScanMapPersistOpen: true });
        return false;
      }
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
  };
}
