import type { SystemSchema } from '@archlens/core';
import type { LoggerPort } from '@archlens/core/logging';
import type { SaveWorkingCopyArgs } from '../../core';
import type { ToastNotification } from '../store/states/uiState';

export type DiagramFileCommit = {
  path: string;
  yaml: string;
  schema: SystemSchema;
  nodeRefMap: Record<string, string>;
  quiet?: boolean;
  isCurrent?: () => boolean;
};

export type DiagramFileCommitDeps = {
  workspacePort: {
    writeFile(relativePath: string, content: string): Promise<boolean>;
    readFile?(relativePath: string): Promise<string>;
  };
  workingCopyPort: { saveBaselineSchema(args: SaveWorkingCopyArgs): Promise<void> };
  logger: Pick<LoggerPort, 'info' | 'error'>;
  setNotification?: (notification: ToastNotification | null) => void;
  checkPendingChanges?: () => void | Promise<void>;
};

function saveIsCurrent(input: DiagramFileCommit): boolean {
  return input.isCurrent?.() !== false;
}

async function diskYamlBeforeGuardedWrite(
  deps: DiagramFileCommitDeps,
  input: DiagramFileCommit
): Promise<string | undefined> {
  if (!input.isCurrent || !deps.workspacePort.readFile) return undefined;
  try {
    return await deps.workspacePort.readFile(input.path);
  } catch {
    return undefined;
  }
}

async function restoreDiskYaml(
  deps: DiagramFileCommitDeps,
  path: string,
  yaml: string | undefined
): Promise<void> {
  if (yaml === undefined) return;
  try {
    const restored = await deps.workspacePort.writeFile(path, yaml);
    if (!restored) {
      deps.logger.error('Failed to restore the on-disk diagram after cancelling a live save');
    }
  } catch (err) {
    deps.logger.error('Failed to restore the on-disk diagram after cancelling a live save', err);
  }
}

export async function commitDiagramFile(
  deps: DiagramFileCommitDeps,
  input: DiagramFileCommit
): Promise<boolean> {
  if (!saveIsCurrent(input)) return false;
  const priorDiskYaml = await diskYamlBeforeGuardedWrite(deps, input);
  if (!saveIsCurrent(input)) return false;

  deps.logger.info('Saving active diagram directly to workspace', { path: input.path });
  try {
    const success = await deps.workspacePort.writeFile(input.path, input.yaml);
    if (!success) {
      if (!saveIsCurrent(input)) return false;
      deps.logger.error('Failed to save diagram');
      deps.setNotification?.({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to write active diagram to disk.',
      });
      return false;
    }
    if (!saveIsCurrent(input)) {
      await restoreDiskYaml(deps, input.path, priorDiskYaml);
      return false;
    }
    deps.logger.info('Diagram saved successfully');
    await deps.workingCopyPort.saveBaselineSchema({
      filePath: input.path,
      schema: input.schema,
      systemId: input.schema.entityRef || 'default',
      nodeRefMap: input.nodeRefMap,
    });
    await deps.checkPendingChanges?.();
    if (!input.quiet) {
      deps.setNotification?.({
        type: 'success',
        title: 'Save Successful',
        message: `Saved active diagram to ${input.path.split('/').pop()}`,
      });
    }
    return true;
  } catch (err) {
    if (!saveIsCurrent(input)) {
      await restoreDiskYaml(deps, input.path, priorDiskYaml);
      return false;
    }
    deps.logger.error('Error saving diagram in workspace', err);
    deps.setNotification?.({
      type: 'error',
      title: 'Save Error',
      message: err instanceof Error ? err.message : 'Error occurred while saving diagram.',
    });
    return false;
  }
}
