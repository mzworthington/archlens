import type { DiagramStateDeps } from './types';
import type { BlueprintStoreSet } from '../../store';

type SetFn = BlueprintStoreSet;
type GetFn = () => DiagramStateDeps;

export function createCheckPendingChanges(set: SetFn, get: GetFn) {
  return async () => {
    const { currentFilePath, hasPendingChanges, workingCopyPort } = get();
    if (!currentFilePath) return;
    try {
      const diff = await workingCopyPort.computeSchemaDiff(currentFilePath);
      const hasChanges =
        diff.nodes.added.length > 0 ||
        diff.nodes.modified.length > 0 ||
        diff.nodes.deleted.length > 0 ||
        diff.dependencies.added.length > 0 ||
        diff.dependencies.deleted.length > 0;
      if (hasPendingChanges !== hasChanges) {
        set({ hasPendingChanges: hasChanges });
      }
    } catch (e) {
      get().logger.error('Failed to compute pending changes diff', e);
    }
  };
}
