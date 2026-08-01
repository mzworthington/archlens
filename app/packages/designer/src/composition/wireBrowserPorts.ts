import { useBlueprintStore } from '../application/store/store';
import type { BrowserPorts } from './createBrowserPorts';

/** Synchronously wire browser adapters before first React paint (avoids bootstrap races). */
export function wireBrowserPorts(ports: BrowserPorts): void {
  const state = useBlueprintStore.getState();
  state.setPorts({
    fileSystemPort: ports.fileSystemPort,
    folderWorkspacePort: ports.folderWorkspacePort,
    sampleWorkspacePort: ports.sampleWorkspacePort,
    ...(state.isSampleWorkspace ? {} : { workspacePort: ports.folderWorkspacePort }),
    logger: ports.logger,
    layoutRegistry: ports.layoutRegistry,
    workingCopyPort: ports.workingCopyPort,
    graphChangePort: ports.graphChangePort,
    resilienceEnginePort: ports.resilienceEnginePort,
  });
}
