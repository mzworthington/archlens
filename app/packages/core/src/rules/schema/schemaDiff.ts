import type { PropertyMap } from '../../models/schema';

/** Snapshot of a node used for structural schema diffs (CLI + Canvas). */
export type SchemaDiffNode = {
  entityRef: string;
  name: string;
  type: string;
  properties: PropertyMap;
  x?: number;
  y?: number;
  external?: boolean;
  isTest?: boolean;
  filePath: string;
};

export type SchemaDiffDependency = {
  id: string;
  fromRef: string;
  toRef: string;
  type: string;
  description?: string;
  filePath: string;
};

export type SchemaDiff = {
  nodes: {
    added: SchemaDiffNode[];
    modified: { original: SchemaDiffNode; current: SchemaDiffNode }[];
    deleted: SchemaDiffNode[];
  };
  dependencies: {
    added: SchemaDiffDependency[];
    deleted: SchemaDiffDependency[];
  };
};

export function schemaDiffHasChanges(diff: SchemaDiff): boolean {
  return (
    diff.nodes.added.length > 0 ||
    diff.nodes.modified.length > 0 ||
    diff.nodes.deleted.length > 0 ||
    diff.dependencies.added.length > 0 ||
    diff.dependencies.deleted.length > 0
  );
}

export type BlueprintFileDiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export type BlueprintFileDiff = {
  relativePath: string;
  status: BlueprintFileDiffStatus;
  diff?: SchemaDiff;
};

export type BlueprintTreeDiff = {
  files: BlueprintFileDiff[];
};

export function blueprintTreeDiffHasChanges(treeDiff: BlueprintTreeDiff): boolean {
  return treeDiff.files.some(file => file.status !== 'unchanged');
}
