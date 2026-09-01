import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AppProvider, type AppPorts } from './AppContext';
import { useBlueprintStore } from '../store/store';
import { wireBrowserPorts } from '../../composition/wireBrowserPorts';
import {
  noopFileSystem,
  noopWorkspace,
  noopLogger,
  noopLayoutRegistry,
  noopWorkingCopy,
  noopGraphChange,
  noopResilienceEngine,
  alwaysOnlineNetworkStatus,
  noopCollabSession,
} from '../../core';

const samplePort = {
  ...noopWorkspace,
  getDirectoryName: () => 'bundled-sample',
};

const folderPort = {
  ...noopWorkspace,
  getDirectoryName: () => 'folder-workspace',
};

function testPorts(overrides: Partial<AppPorts> = {}): AppPorts {
  return {
    fileSystemPort: noopFileSystem,
    folderWorkspacePort: folderPort,
    sampleWorkspacePort: samplePort,
    logger: noopLogger,
    layoutRegistry: noopLayoutRegistry,
    workingCopyPort: noopWorkingCopy,
    graphChangePort: noopGraphChange,
    networkStatus: alwaysOnlineNetworkStatus,
    resilienceEnginePort: noopResilienceEngine,
    collabSessionPort: noopCollabSession,
    ...overrides,
  };
}

describe('AppProvider port wiring', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isSampleWorkspace: false,
      workspacePort: noopWorkspace,
      folderWorkspacePort: noopWorkspace,
      sampleWorkspacePort: noopWorkspace,
    });
  });

  it('wires browser ports synchronously before React effects', () => {
    wireBrowserPorts(testPorts());
    expect(useBlueprintStore.getState().sampleWorkspacePort).toBe(samplePort);
    expect(useBlueprintStore.getState().folderWorkspacePort).toBe(folderPort);
    expect(useBlueprintStore.getState().workspacePort).toBe(folderPort);
  });

  it('does not replace the bundled sample workspace port after sample open', () => {
    useBlueprintStore.setState({
      isSampleWorkspace: true,
      workspacePort: samplePort,
      sampleWorkspacePort: samplePort,
    });

    render(
      <AppProvider ports={testPorts({ sampleWorkspacePort: samplePort })}>
        <div>child</div>
      </AppProvider>
    );

    expect(useBlueprintStore.getState().workspacePort).toBe(samplePort);
    expect(useBlueprintStore.getState().isSampleWorkspace).toBe(true);
  });
});
