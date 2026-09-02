import {
  validateGraph,
  serializeSchemaToYaml,
  systemSchemaPublicUrl,
  type SystemSchema,
} from '@archlens/core';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { SAMPLES_CONTEXT_PATH } from '../../samplesWorkspace';

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
  version: systemSchemaPublicUrl(),
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
    currentFilePath: SAMPLES_CONTEXT_PATH,
    loadedSystems: [],
    nodeRefMap: {},
  };
}
