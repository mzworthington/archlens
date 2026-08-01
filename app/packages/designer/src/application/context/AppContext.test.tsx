import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AppProvider } from './AppContext';
import { useBlueprintStore } from '../store/store';
import { BundledSampleWorkspaceAdapter } from '../../infrastructure/fileSystem/bundledSampleWorkspace';
import { noopWorkspace } from '../../core';

describe('AppProvider port wiring', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isSampleWorkspace: false,
      workspacePort: noopWorkspace,
    });
  });

  it('does not replace the bundled sample workspace port after sample open', () => {
    useBlueprintStore.setState({
      isSampleWorkspace: true,
      workspacePort: BundledSampleWorkspaceAdapter,
    });

    render(
      <AppProvider>
        <div>child</div>
      </AppProvider>
    );

    expect(useBlueprintStore.getState().workspacePort).toBe(BundledSampleWorkspaceAdapter);
    expect(useBlueprintStore.getState().isSampleWorkspace).toBe(true);
  });
});
