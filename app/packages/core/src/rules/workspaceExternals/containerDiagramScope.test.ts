import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '../../models/schema';
import { buildWorkspaceEntityIndex } from './entityIndex';
import {
  findOwningContainerDiagram,
  collectComponentDiagramNeighborRefs,
} from './containerDiagramScope';
import {
  suggestOverviewExternalDependencies,
  groupOverviewExternalsByBand,
  classifyOverviewExternalDirection,
} from './externalScope';

const appContainers: SystemSchema = {
  name: 'App Containers',
  version: '1.0.0',
  level: 'container',
  entityRef: 'blueprint/app',
  nodes: [
    { entityRef: 'blueprint/app/core', type: 'container', name: 'Core Service' },
    { entityRef: 'blueprint/app/cli', type: 'container', name: 'Cli Service' },
    { entityRef: 'blueprint/app/designer', type: 'container', name: 'Designer Service' },
    { entityRef: 'blueprint/app/core/forensics', type: 'container', name: 'Forensics' },
  ],
  dependencies: [
    { from: 'blueprint/app/cli', to: 'blueprint/app/core/forensics', type: 'direct-call' },
    { from: 'blueprint/app/designer', to: 'blueprint/app/core/forensics', type: 'direct-call' },
    { from: 'blueprint/app/core', to: 'blueprint/app/core/schema', type: 'direct-call' },
  ],
};

const forensicsComponents: SystemSchema = {
  name: 'Forensics Components',
  version: '1.0.0',
  level: 'component',
  entityRef: 'blueprint/app/core/forensics',
  nodes: [
    {
      entityRef: 'blueprint/app/core/forensics/ownership',
      type: 'background-worker',
      name: 'Ownership',
    },
  ],
  dependencies: [
    {
      from: 'blueprint/app/core/forensics/ownership',
      to: 'blueprint/app/core/schema/schema',
      type: 'direct-call',
    },
  ],
};

const loadedSystems = [
  { path: 'containers.yaml', name: 'App', schema: appContainers },
  { path: 'forensics-components.yaml', name: 'Forensics', schema: forensicsComponents },
];

describe('containerDiagramScope', () => {
  it('finds the app container diagram for a nested component diagram', () => {
    const owned = findOwningContainerDiagram(forensicsComponents, loadedSystems);
    expect(owned?.system.schema.entityRef).toBe('blueprint/app');
    expect(owned?.scopeRef).toBe('blueprint/app/core/forensics');
  });

  it('collects sibling app containers from parent container dependencies', () => {
    const neighbors = collectComponentDiagramNeighborRefs(forensicsComponents, loadedSystems);
    expect(neighbors).toContain('blueprint/app/cli');
    expect(neighbors).toContain('blueprint/app/designer');
    expect(neighbors).not.toContain('blueprint/app/core/schema');
  });
});

describe('forensics overview externals', () => {
  it('suggests app-level containers for the forensics component diagram', () => {
    const index = buildWorkspaceEntityIndex(loadedSystems);
    const overview = suggestOverviewExternalDependencies(forensicsComponents, loadedSystems, index);
    const refs = overview.map(entity => entity.entityRef);
    expect(refs).toContain('blueprint/app/cli');
    expect(refs).toContain('blueprint/app/designer');
  });

  it('classifies cli as a caller using workspace container dependencies', () => {
    const direction = classifyOverviewExternalDirection(
      'blueprint/app/cli',
      forensicsComponents,
      appContainers.dependencies
    );
    expect(direction).toEqual({ upstream: true, downstream: false });
  });

  it('groups overview externals into caller and target bands', () => {
    const index = buildWorkspaceEntityIndex(loadedSystems);
    const overview = suggestOverviewExternalDependencies(forensicsComponents, loadedSystems, index);
    const bands = groupOverviewExternalsByBand(
      forensicsComponents,
      overview,
      appContainers.dependencies
    );
    expect(bands.callers.map(entity => entity.entityRef)).toContain('blueprint/app/cli');
    expect(bands.callers.map(entity => entity.entityRef)).toContain('blueprint/app/designer');
  });
});
