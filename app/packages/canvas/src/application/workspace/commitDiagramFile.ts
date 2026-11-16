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
};

export type DiagramFileCommitDeps = {
  workspacePort: { writeFile(relativePath: string, content: string): Promise<boolean> };
  workingCopyPort: { saveBaselineSchema(args: SaveWorkingCopyArgs): Promise<void> };
  logger: Pick<LoggerPort, 'info' | 'error'>;
  setNotification?: (notification: ToastNotification | null) => void;
  checkPendingChanges?: () => void | Promise<void>;
};

export async function commitDiagramFile(
  deps: DiagramFileCommitDeps,
  input: DiagramFileCommit
): Promise<boolean> {
  deps.logger.info('Saving active diagram directly to workspace', { path: input.path });
  try {
    const success = await deps.workspacePort.writeFile(input.path, input.yaml);
    if (!success) {
      deps.logger.error('Failed to save diagram');
      deps.setNotification?.({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to write active diagram to disk.',
      });
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
    deps.logger.error('Error saving diagram in workspace', err);
    deps.setNotification?.({
      type: 'error',
      title: 'Save Error',
      message: err instanceof Error ? err.message : 'Error occurred while saving diagram.',
    });
    return false;
  }
}
