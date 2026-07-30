import type {
  C4Level,
  EntityRef,
  NodeType,
  SystemDependency,
  SystemNode,
  SystemSchema,
} from '../../models/schema';

export interface LoadedSystemInput {
  path: string;
  name: string;
  schema: SystemSchema;
}

export interface WorkspaceEntity {
  entityRef: EntityRef;
  name: string;
  type: NodeType;
  /** C4 level of the schema file that owns this entity. */
  sourceSchemaLevel: C4Level;
  sourcePath: string;
  parentContainerRef?: EntityRef;
  properties?: SystemNode['properties'];
}

export interface WorkspaceEntityIndex {
  byRef: Map<EntityRef, WorkspaceEntity>;
}

export interface WorkspaceFilepathIndex {
  byPath: Map<string, WorkspaceEntity>;
}

export interface ExternalCandidateFilters {
  sourceSchemaLevels?: C4Level[];
  types?: NodeType[];
  search?: string;
}

export type ExternalEnrichMode = 'suggested' | 'unresolved';

export interface EnrichExternalsOptions {
  /** Default: `suggested` (neighbor containers + cross-diagram + unresolved). */
  mode?: ExternalEnrichMode;
  /**
   * On container-level diagrams, only materialize container-level entities.
   * Default: true.
   */
  containersOnlyOnContainerDiagrams?: boolean;
  /**
   * Only enrich schemas at these C4 levels. When set, other levels are returned unchanged.
   * Useful for CLI passes that should never touch context diagrams.
   */
  enrichLevels?: C4Level[];
}

export interface CrossContainerComponentDep {
  fromComponent: EntityRef;
  toComponent: EntityRef;
  fromContainer: EntityRef;
  toContainer: EntityRef;
  type: SystemDependency['type'];
}
