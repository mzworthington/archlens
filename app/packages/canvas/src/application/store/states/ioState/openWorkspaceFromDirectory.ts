import {
  beginWorkspaceOpen,
  isWorkspaceOpenCurrent,
  markFolderWorkspacePreferred,
} from '../../workspaceOpenSession';
import { loadWorkspaceFromYamlFiles } from './openWorkspaceFromYamlFiles';
import type { OpenWorkspaceDeps } from './openWorkspaceTypes';

export async function loadWorkspaceFromDirectory(deps: OpenWorkspaceDeps): Promise<boolean> {
  const {
    logger,
    setNotification,
    initSchema,
    set,
    isSampleWorkspace = false,
    committedPorts,
  } = deps;
  logger.info(
    isSampleWorkspace ? 'Opening bundled sample workspace' : 'Opening workspace folder picker'
  );

  const ok = await deps.selectDirectory();
  if (!ok) return false;

  const openGeneration = beginWorkspaceOpen();
  markFolderWorkspacePreferred();

  const files = await deps.readDirectoryFiles();
  if (!isWorkspaceOpenCurrent(openGeneration)) return false;
  if (files.length === 0) {
    throw new Error('No blueprint .yaml or .yml files found in selected directory');
  }

  return loadWorkspaceFromYamlFiles({
    files,
    workspaceName: deps.getDirectoryName(),
    workingCopy: deps.workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
    isSampleWorkspace,
    openGeneration,
    committedPorts,
  });
}
