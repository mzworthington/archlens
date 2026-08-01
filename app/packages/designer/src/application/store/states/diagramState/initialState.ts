import { validateGraph, serializeSchemaToYaml, type SystemSchema } from '@archlens/core';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { GOLDEN_PATHS_CONTEXT_PATH } from '../../goldenPathsSample';

export interface DiagramInitialState {
  schema: SystemSchema;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  validationResult: ReturnType<typeof validateGraph>;
  yamlCode: string;
  currentFilePath: string;
  loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
  nodeRefMap: Record<string, Record<string, string>>;
}

const emptySchema: SystemSchema = {
  name: 'Loading',
  version: '1.0.0',
  level: 'context',
  nodes: [],
  dependencies: [],
};

/** Minimal store boot state before a workspace folder or sample is opened. */
export function createDiagramInitialState(): DiagramInitialState {
  return {
    schema: emptySchema,
    nodes: [],
    edges: [],
    validationResult: validateGraph(emptySchema),
    yamlCode: serializeSchemaToYaml(emptySchema),
    currentFilePath: GOLDEN_PATHS_CONTEXT_PATH,
    loadedSystems: [],
    nodeRefMap: {},
  };
}
