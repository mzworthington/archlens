import { useEffect } from 'react';
import { useBlueprintStore } from '../../../../application/store/store';
import { shouldWarnBeforeLeavingBlankCanvas } from '../../../../application/store/states/diagramState/emptyWorkspaceDraft';

/** Browser leave warning for Ideate drafts that have not been written to a folder. */
export function useBlankCanvasUnloadGuard(): void {
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const { isWorkspaceOpen, nodes } = useBlueprintStore.getState();
      if (
        !shouldWarnBeforeLeavingBlankCanvas({
          isWorkspaceOpen,
          nodeCount: nodes.length,
        })
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
}
