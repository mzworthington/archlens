import type { WorkspaceCatalogEntry } from '@archlens/core';
import { GOLDEN_JOURNEY_CONTAINERS_PATH, SAMPLES_CONTEXT_PATH } from '../../samplesWorkspace';
import type { WorkspaceOpenLogger } from './openWorkspaceShared';

const OPEN_WORKSPACE_SCHEMA_VERSION = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

const OPEN_WORKSPACE_CONTEXT_YAML = `
version: ${OPEN_WORKSPACE_SCHEMA_VERSION}
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

export const OPEN_WORKSPACE_CONTAINERS_YAML = `
version: ${OPEN_WORKSPACE_SCHEMA_VERSION}
level: container
metadata:
  entityRef: samples/golden-journey
  name: Golden Journey Estate
nodes:
  - entityRef: samples/golden-journey/web
    type: web-app
    name: Web
dependencies: []
`;

export const openWorkspaceCatalogFixture: WorkspaceCatalogEntry[] = [
  {
    path: 'advicelens-stress/context.yaml',
    name: 'AdviceLens Stress',
    level: 'context',
    entityRef: 'advicelens-stress',
    nodeEntityRefs: [],
  },
  {
    path: SAMPLES_CONTEXT_PATH,
    name: 'Samples',
    level: 'context',
    entityRef: 'samples',
    nodeEntityRefs: ['samples/golden-journey'],
  },
  {
    path: GOLDEN_JOURNEY_CONTAINERS_PATH,
    name: 'Golden Journey Estate',
    level: 'container',
    entityRef: 'samples/golden-journey',
    nodeEntityRefs: ['samples/golden-journey/web'],
    parentEntityRef: 'samples',
  },
  {
    path: 'other/containers.yaml',
    name: 'Other',
    level: 'container',
    entityRef: 'other',
    nodeEntityRefs: [],
  },
];

export const openWorkspaceDiskFilesFixture = [
  { name: SAMPLES_CONTEXT_PATH, content: OPEN_WORKSPACE_CONTEXT_YAML },
  { name: GOLDEN_JOURNEY_CONTAINERS_PATH, content: OPEN_WORKSPACE_CONTAINERS_YAML },
];

export function createOpenWorkspaceLogger(): WorkspaceOpenLogger {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
}

export function createOpenWorkspaceWorkingCopy() {
  return {
    saveBaselineSchema: async () => undefined,
    saveWorkingSchema: async () => undefined,
    loadWorkingSchema: async () => null,
  };
}

export async function readOpenWorkspaceFixtureFile(path: string): Promise<string> {
  if (path === SAMPLES_CONTEXT_PATH) return OPEN_WORKSPACE_CONTEXT_YAML;
  if (path === GOLDEN_JOURNEY_CONTAINERS_PATH) return OPEN_WORKSPACE_CONTAINERS_YAML;
  throw new Error(`unexpected read: ${path}`);
}
