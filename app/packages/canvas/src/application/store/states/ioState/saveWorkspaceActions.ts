import { persistBlankCanvasSessionFromSchema } from './blankCanvasSession';
import { yamlFileNameFromDiagramName } from './yamlFileNameFromDiagramName';
import { loadWorkspaceFromYamlFiles } from './openWorkspace';
import type { BlueprintStoreSet } from '../../store';
import type { DiagramState } from '../diagramState';
import type { UiState } from '../uiState';
import type { IoState } from '../ioState';

type IoGet = () => IoState & DiagramState & UiState;

export function createSaveWorkspaceActions(set: BlueprintStoreSet, get: IoGet) {
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
