import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import { useBlueprintStore } from '../store';
import type { WorkspacePort } from '../../../core';
import { db } from '../../../infrastructure/db/db';
import { dexieWorkingCopyAdapter } from '../../../infrastructure/db/dexieWorkingCopyAdapter';
import { SAMPLES_CONTEXT_PATH } from '../samplesWorkspace';
import * as sampleWorkspaceLoader from '../../../infrastructure/fileSystem/sampleWorkspaceLoader';
import * as bundledSampleWorkspace from '../../../infrastructure/fileSystem/bundledSampleWorkspace';
import { resetWorkspaceOpenSessionForTests } from '../workspaceOpenSession';

describe('ioState Actions & State Management', () => {
  const v3Version = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

  const mockFiles: Record<string, string> = {
    'blueprint.yaml': `
version: ${v3Version}
level: context
metadata:
  entityRef: root
  name: Root Context
nodes:
  - entityRef: root/web-app
    type: web-app
    name: Web App
dependencies: []
`,
    'web/container.yaml': `
version: ${v3Version}
level: container
metadata:
  entityRef: root/web-app
  name: Web Containers
nodes:
  - entityRef: root/web-app/controller
    type: component
    name: API Controller
dependencies: []
`,
  };

  const mockWorkspacePort: WorkspacePort = {
    selectDirectory: async () => true,
    readFile: async (path: string) => {
      if (mockFiles[path]) return mockFiles[path];
      throw new Error(`File not found: ${path}`);
    },
    writeFile: async (path: string, content: string) => {
      mockFiles[path] = content;
      return true;
    },
    getDirectoryName: () => 'MockWorkspace',
    hasPermission: async () => true,
    readDirectoryFiles: async () => {
      return Object.entries(mockFiles)
        .filter(([path]) => path.endsWith('.yaml') || path.endsWith('.yml'))
        .map(([path, content]) => ({ name: path, content }));
    },
  };

  beforeEach(async () => {
    resetWorkspaceOpenSessionForTests();
    delete mockFiles['another-system.yaml'];
    await db.originalNodes.clear();
    await db.workingNodes.clear();
    await db.originalDependencies.clear();
    await db.workingDependencies.clear();
    useBlueprintStore.setState({
      workspacePort: mockWorkspacePort,
      folderWorkspacePort: mockWorkspacePort,
      workingCopyPort: dexieWorkingCopyAdapter,
      currentFilePath: 'blueprint.yaml',
      isWorkspaceOpen: false,
      isSampleWorkspace: false,
      workspaceName: '',
      lastError: null,
      notification: null,
    });
  });

  it('should open workspace, read blueprint.yaml, and mark workspace as open', async () => {
    const store = useBlueprintStore.getState();
    const success = await store.openWorkspaceDirectory();

    expect(success).toBe(true);
    const updatedState = useBlueprintStore.getState();
    expect(updatedState.isWorkspaceOpen).toBe(true);
    expect(updatedState.isSampleWorkspace).toBe(false);
    expect(updatedState.workspaceName).toBe('MockWorkspace');
    expect(updatedState.currentFilePath).toBe('blueprint.yaml');
    expect(updatedState.schema.name).toBe('Root Context');
    expect(updatedState.schema.level).toBe('context');
    expect(updatedState.nodes).toHaveLength(1);
    expect(updatedState.schemaVersionWarning).toBeNull();
    expect(useBlueprintStore.getState().notification).toBeNull();
  });

  it('runs browser repo scan from a mocked source directory and opens generated blueprints', async () => {
    const makeFileHandle = (name: string, content: string) => ({
      kind: 'file',
      name,
      getFile: async () => new File([content], name),
    });
    const srcHandle = {
      kind: 'directory',
      name: 'src',
      async *[Symbol.asyncIterator]() {
        yield ['index.ts', makeFileHandle('index.ts', "import { service } from './service';\n")];
        yield ['service.ts', makeFileHandle('service.ts', 'export const service = 1;\n')];
      },
    };
    const rootHandle = {
      kind: 'directory',
      name: 'demo-repo',
      async *[Symbol.asyncIterator]() {
        yield ['package.json', makeFileHandle('package.json', '{"name":"demo-repo"}')];
        yield ['src', srcHandle];
      },
    };

    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: vi.fn(async () => rootHandle),
    });

    const opened = await useBlueprintStore.getState().openBrowserLiteScan();

    const state = useBlueprintStore.getState();
    expect(opened, state.lastError ?? 'openBrowserLiteScan returned false').toBe(true);
    expect(state.isWorkspaceOpen).toBe(true);
    expect(state.isSampleWorkspace).toBe(false);
    expect(state.isBrowserLiteWorkspace).toBe(true);
    expect(state.browserLiteBannerOpen).toBe(true);
    expect(state.workspaceName).toBe('demo-repo');
    expect(state.schema.level).toBe('context');
    expect(state.workspaceCatalog.some(entry => entry.path.endsWith('context.yaml'))).toBe(true);
    expect(state.notification?.title).toBe('Browser lite scan ready');
    expect(state.notification?.message).toContain('structure only');
  });

  it('notifies when the browser cannot pick a source directory', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'showDirectoryPicker');
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: undefined,
    });

    const opened = await useBlueprintStore.getState().openBrowserLiteScan();
    const state = useBlueprintStore.getState();

    expect(opened).toBe(false);
    expect(state.notification?.title).toBe('Browser lite scan unavailable');
    expect(state.notification?.message).toMatch(/Firefox|Safari|File System Access/i);

    if (original) {
      Object.defineProperty(window, 'showDirectoryPicker', original);
    } else {
      Reflect.deleteProperty(window, 'showDirectoryPicker');
    }
  });

  it('should catalog all systems on open and lazy-load when selecting another', async () => {
    mockFiles['another-system.yaml'] = `
version: ${v3Version}
level: container
metadata:
  name: Another System
nodes: []
dependencies: []
`;
    const store = useBlueprintStore.getState();
    const success = await store.openWorkspaceDirectory();
    expect(success).toBe(true);

    const state = useBlueprintStore.getState();
    expect(state.loadedSystems).toHaveLength(1);
    expect(state.loadedSystems[0].path).toBe('blueprint.yaml');
    expect(state.workspaceCatalog).toHaveLength(3);
    expect(state.workspaceCatalog.map(e => e.path).sort()).toEqual([
      'another-system.yaml',
      'blueprint.yaml',
      'web/container.yaml',
    ]);
    expect(state.currentFilePath).toBe('blueprint.yaml');

    await store.selectSystem('another-system.yaml');
    const state2 = useBlueprintStore.getState();
    expect(state2.currentFilePath).toBe('another-system.yaml');
    expect(state2.schema.name).toBe('Another System');
    expect(state2.loadedSystems.map(s => s.path)).toEqual(
      expect.arrayContaining(['blueprint.yaml', 'another-system.yaml'])
    );
  });

  describe('saveSchema error handling', () => {
    it('should return false if saveSchema port operation fails', async () => {
      const store = useBlueprintStore.getState();
      const spySave = vi.spyOn(store.fileSystemPort, 'saveSchema');
      spySave.mockResolvedValue(false);

      const success = await store.saveSchema();
      expect(success).toBe(false);
      spySave.mockRestore();
    });

    it('should return false and log error if saveSchema throws', async () => {
      const store = useBlueprintStore.getState();
      const spySave = vi.spyOn(store.fileSystemPort, 'saveSchema');
      spySave.mockRejectedValue(new Error('Write permission denied'));

      const success = await store.saveSchema();
      expect(success).toBe(false);
      spySave.mockRestore();
    });
  });

  describe('loadSchema error handling', () => {
    it('should load content and return true on successful parsing', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockResolvedValue(`version: ${v3Version}
level: context
metadata:
  name: Test Load
nodes: []`);

      const success = await store.loadSchema();
      expect(success).toBe(true);
      expect(useBlueprintStore.getState().schema.name).toBe('Test Load');
      spyLoad.mockRestore();
    });

    it('should return false if loadSchema is cancelled by user', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockResolvedValue(null);

      const success = await store.loadSchema();
      expect(success).toBe(false);
      spyLoad.mockRestore();
    });

    it('should return false if loadSchema throws', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockRejectedValue(new Error('File corrupted'));

      const success = await store.loadSchema();
      expect(success).toBe(false);
      spyLoad.mockRestore();
    });
  });

  describe('saveActiveDiagram logic', () => {
    it('should delegate to saveSchema when workspace is not open', async () => {
      const store = useBlueprintStore.getState();
      const originalSaveSchema = store.saveSchema;
      useBlueprintStore.setState({ isWorkspaceOpen: false, isSampleWorkspace: false });

      const mockSaveSchema = vi.fn().mockResolvedValue(true);
      useBlueprintStore.setState({ saveSchema: mockSaveSchema });

      const success = await store.saveActiveDiagram();
      expect(success).toBe(true);
      expect(mockSaveSchema).toHaveBeenCalled();

      useBlueprintStore.setState({ saveSchema: originalSaveSchema });
    });

    it('should delegate to saveSchema for bundled sample workspaces', async () => {
      const store = useBlueprintStore.getState();
      const originalSaveSchema = store.saveSchema;
      useBlueprintStore.setState({ isWorkspaceOpen: true, isSampleWorkspace: true });

      const mockSaveSchema = vi.fn().mockResolvedValue(true);
      useBlueprintStore.setState({ saveSchema: mockSaveSchema });

      const success = await store.saveActiveDiagram();
      expect(success).toBe(true);
      expect(mockSaveSchema).toHaveBeenCalled();

      useBlueprintStore.setState({ saveSchema: originalSaveSchema });
    });

    it('should write to file successfully when workspace is open', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();

      const spyWrite = vi.spyOn(store.workspacePort, 'writeFile');
      spyWrite.mockResolvedValue(true);

      const success = await store.saveActiveDiagram();
      expect(success).toBe(true);
      spyWrite.mockRestore();
    });

    it('should return false if writeFile fails or throws when workspace is open', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();

      const spyWrite = vi.spyOn(store.workspacePort, 'writeFile');
      spyWrite.mockRejectedValue(new Error('Read-only filesystem'));

      const success = await store.saveActiveDiagram();
      expect(success).toBe(false);
      spyWrite.mockRestore();
    });
  });

  describe('openWorkspaceDirectory edge cases', () => {
    it('should fail if no files are returned from workspace', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('No blueprint .yaml or .yml');
      spyRead.mockRestore();
    });

    it('should log/skip invalid schemas and continue if at least one schema is valid', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([
        { name: 'notes.yaml', content: 'invalid: :yaml' },
        { name: 'broken-schema.yaml', content: 'name: Broken\nlevel: invalid' },
        {
          name: 'valid.yaml',
          content: `version: ${v3Version}
level: context
metadata:
  entityRef: valid
  name: Valid Schema
nodes: []`,
        },
      ]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(true);
      expect(useBlueprintStore.getState().schema.name).toBe('Valid Schema');
      spyRead.mockRestore();
    });

    it('should fail if all schema files fail to parse', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([{ name: 'broken.yaml', content: 'invalid: :yaml' }]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('No valid blueprint schemas found');
      spyRead.mockRestore();
    });

    it('discards IndexedDB drafts whose topology no longer matches disk YAML', async () => {
      const { saveWorkingSchema, loadWorkingSchema } =
        await import('../../../infrastructure/db/db');

      await saveWorkingSchema(
        'blueprint.yaml',
        {
          name: 'Root Context',
          version: '1.0.0',
          level: 'context',
          entityRef: 'root',
          nodes: [
            { entityRef: 'root/web-app', type: 'web-app', name: 'Web App' },
            { entityRef: 'root/orphan', type: 'microservice', name: 'Stale Orphan' },
          ],
          dependencies: [
            {
              from: 'root/orphan',
              to: 'root/web-app',
              type: 'direct-call',
              description: 'Part of product system',
            },
          ],
        },
        'root',
        {}
      );

      const store = useBlueprintStore.getState();
      const setNotification = vi.fn();
      useBlueprintStore.setState({ setNotification });

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(true);

      const state = useBlueprintStore.getState();
      expect(state.schema.nodes.map(n => n.entityRef)).toEqual(['root/web-app']);
      expect(state.schema.dependencies).toEqual([]);
      expect(setNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Loaded files from disk',
        })
      );

      const working = await loadWorkingSchema(
        'blueprint.yaml',
        'Root Context',
        '1.0.0',
        'context',
        'root'
      );
      expect(working?.nodes).toHaveLength(1);
      expect(working?.dependencies).toEqual([]);
    });
  });

  describe('openBundledSample', () => {
    it('opens from prebuilt catalog and only reads the entry YAML', async () => {
      const catalog: WorkspaceCatalogEntry[] = [
        {
          path: SAMPLES_CONTEXT_PATH,
          name: 'Samples',
          level: 'context',
          entityRef: 'samples',
          nodeEntityRefs: ['samples/golden-journey'],
        },
        {
          path: 'golden-journey/containers.yaml',
          name: 'Golden Journey Estate',
          level: 'container',
          entityRef: 'samples/golden-journey',
          nodeEntityRefs: ['samples/golden-journey/web'],
          parentEntityRef: 'samples',
        },
      ];
      const readFile = vi.fn(async (path: string) => {
        if (path !== SAMPLES_CONTEXT_PATH) {
          throw new Error(`unexpected read: ${path}`);
        }
        return `
version: ${v3Version}
level: context
metadata:
  entityRef: samples
  name: Samples
nodes:
  - entityRef: samples/golden-journey
    type: software-system
    name: Golden Journey
dependencies: []
`;
      });
      const samplePort = {
        ...mockWorkspacePort,
        getDirectoryName: () => 'blueprints',
        readFile,
        readDirectoryFiles: vi.fn(async () => {
          throw new Error('readDirectoryFiles should not be used for bundled sample open');
        }),
      };

      const loadSession = vi
        .spyOn(sampleWorkspaceLoader, 'loadSampleWorkspaceSession')
        .mockImplementation(async () => {
          expect(useBlueprintStore.getState().isLoading).toBe('Loading sandbox...');
          return { catalog, workspacePort: samplePort, usesRemoteCatalog: false };
        });
      const schedulePreload = vi
        .spyOn(bundledSampleWorkspace, 'scheduleBundledBlueprintPreload')
        .mockImplementation(() => undefined);

      useBlueprintStore.setState({
        sampleWorkspacePort: samplePort,
        workspacePort: samplePort,
        isLoading: false,
      });

      const success = await useBlueprintStore.getState().openBundledSample();
      expect(success).toBe(true);

      const state = useBlueprintStore.getState();
      expect(state.isSampleWorkspace).toBe(true);
      expect(state.workspaceCatalog).toEqual(catalog);
      expect(state.loadedSystems).toHaveLength(1);
      expect(state.currentFilePath).toBe(SAMPLES_CONTEXT_PATH);
      expect(state.schema.name).toBe('Samples');
      expect(state.isLoading).toBe(false);
      expect(readFile).toHaveBeenCalledTimes(1);
      expect(samplePort.readDirectoryFiles).not.toHaveBeenCalled();
      expect(loadSession).toHaveBeenCalledTimes(1);
      expect(schedulePreload).toHaveBeenCalledTimes(1);
      expect(schedulePreload).toHaveBeenCalledWith(catalog);

      loadSession.mockRestore();
      schedulePreload.mockRestore();
    });

    it('does not overwrite a folder workspace when sample load finishes after folder open', async () => {
      let releaseSampleSession: (value: unknown) => void = () => undefined;
      const sampleSessionGate = new Promise(resolve => {
        releaseSampleSession = resolve;
      });

      const catalog: WorkspaceCatalogEntry[] = [
        {
          path: SAMPLES_CONTEXT_PATH,
          name: 'Samples',
          level: 'context',
          entityRef: 'samples',
          nodeEntityRefs: [],
        },
      ];
      const samplePort = {
        ...mockWorkspacePort,
        getDirectoryName: () => 'samples',
        readFile: vi.fn(
          async () => `
version: ${v3Version}
level: context
metadata:
  entityRef: samples
  name: Samples
nodes: []
dependencies: []
`
        ),
      };

      const loadSession = vi
        .spyOn(sampleWorkspaceLoader, 'loadSampleWorkspaceSession')
        .mockImplementation(async () => {
          await sampleSessionGate;
          return { catalog, workspacePort: samplePort, usesRemoteCatalog: false };
        });
      const schedulePreload = vi
        .spyOn(bundledSampleWorkspace, 'scheduleBundledBlueprintPreload')
        .mockImplementation(() => undefined);

      useBlueprintStore.setState({
        sampleWorkspacePort: samplePort,
        folderWorkspacePort: mockWorkspacePort,
        workspacePort: mockWorkspacePort,
      });

      const samplePromise = useBlueprintStore.getState().openBundledSample();
      const folderOpened = await useBlueprintStore.getState().openWorkspaceDirectory();
      expect(folderOpened).toBe(true);
      expect(useBlueprintStore.getState().isSampleWorkspace).toBe(false);
      expect(useBlueprintStore.getState().workspaceName).toBe('MockWorkspace');

      releaseSampleSession(undefined);
      const sampleOpened = await samplePromise;
      expect(sampleOpened).toBe(false);
      expect(useBlueprintStore.getState().isSampleWorkspace).toBe(false);
      expect(useBlueprintStore.getState().workspaceName).toBe('MockWorkspace');
      expect(schedulePreload).not.toHaveBeenCalled();

      loadSession.mockRestore();
      schedulePreload.mockRestore();
    });

    it('keeps sample mode when the folder picker is cancelled', async () => {
      useBlueprintStore.setState({
        isWorkspaceOpen: true,
        isSampleWorkspace: true,
        workspaceName: 'samples',
        folderWorkspacePort: {
          ...mockWorkspacePort,
          selectDirectory: async () => false,
        },
      });

      const opened = await useBlueprintStore.getState().openWorkspaceDirectory();
      expect(opened).toBe(false);
      expect(useBlueprintStore.getState().isSampleWorkspace).toBe(true);
      expect(useBlueprintStore.getState().workspaceName).toBe('samples');
    });

    it('does not apply sample ports when finalize loses to a newer folder open', async () => {
      let releaseSampleSession: (value: unknown) => void = () => undefined;
      const sampleSessionGate = new Promise(resolve => {
        releaseSampleSession = resolve;
      });

      const catalog: WorkspaceCatalogEntry[] = [
        {
          path: SAMPLES_CONTEXT_PATH,
          name: 'Samples',
          level: 'context',
          entityRef: 'samples',
          nodeEntityRefs: [],
        },
      ];
      const samplePort = {
        ...mockWorkspacePort,
        getDirectoryName: () => 'samples-should-not-win',
        readFile: vi.fn(
          async () => `
version: ${v3Version}
level: context
metadata:
  entityRef: samples
  name: Samples
nodes: []
dependencies: []
`
        ),
      };

      const loadSession = vi
        .spyOn(sampleWorkspaceLoader, 'loadSampleWorkspaceSession')
        .mockImplementation(async () => {
          await sampleSessionGate;
          return { catalog, workspacePort: samplePort, usesRemoteCatalog: false };
        });

      useBlueprintStore.setState({
        sampleWorkspacePort: mockWorkspacePort,
        folderWorkspacePort: mockWorkspacePort,
        workspacePort: mockWorkspacePort,
      });

      const samplePromise = useBlueprintStore.getState().openBundledSample();
      await useBlueprintStore.getState().openWorkspaceDirectory();
      releaseSampleSession(undefined);
      await samplePromise;

      const state = useBlueprintStore.getState();
      expect(state.isSampleWorkspace).toBe(false);
      expect(state.workspaceName).toBe('MockWorkspace');
      expect(state.workspacePort.getDirectoryName()).toBe('MockWorkspace');

      loadSession.mockRestore();
    });
  });
});
