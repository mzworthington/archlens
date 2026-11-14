import type { C4Level, SystemSchema } from '../models/schema';
import { NEXT_C4_LEVEL } from './entityRef';

export type ChildZoomRequest = {
  nodeEntityRef: string;
  nodeName: string;
  parentLevel: C4Level;
  version: string;
  parentPath: string;
  existingPaths: readonly string[];
};

export type ChildZoomDiagram = {
  path: string;
  schema: SystemSchema;
};

const FILE_SUFFIX: Record<C4Level, string> = {
  context: 'context',
  container: 'containers',
  component: 'components',
  code: 'code',
};

const NAME_SUFFIX: Record<C4Level, string> = {
  context: 'Context',
  container: 'Containers',
  component: 'Components',
  code: 'Code',
};

function siblingPath(parentPath: string, fileName: string): string {
  const slash = parentPath.lastIndexOf('/');
  if (slash < 0) return fileName;
  return `${parentPath.slice(0, slash + 1)}${fileName}`;
}

function uniqueSiblingPath(
  parentPath: string,
  baseName: string,
  existingPaths: readonly string[]
): string {
  const taken = new Set(existingPaths);
  let candidate = siblingPath(parentPath, baseName);
  if (!taken.has(candidate)) return candidate;

  const dot = baseName.lastIndexOf('.');
  const stem = dot >= 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot >= 0 ? baseName.slice(dot) : '';
  let n = 2;
  while (taken.has(candidate)) {
    candidate = siblingPath(parentPath, `${stem}-${n}${ext}`);
    n += 1;
  }
  return candidate;
}

/** Empty BlueprintSpec one C4 level below a canvas node, linked by entityRef. */
export function buildChildZoomDiagram(request: ChildZoomRequest): ChildZoomDiagram | undefined {
  const nodeEntityRef = request.nodeEntityRef.trim();
  if (!nodeEntityRef) return undefined;

  const level = NEXT_C4_LEVEL[request.parentLevel];
  const leaf = nodeEntityRef.split('/').filter(Boolean).pop() || 'diagram';
  const label = request.nodeName.trim() || leaf;

  return {
    path: uniqueSiblingPath(
      request.parentPath,
      `${leaf}-${FILE_SUFFIX[level]}.yaml`,
      request.existingPaths
    ),
    schema: {
      entityRef: nodeEntityRef,
      name: `${label} ${NAME_SUFFIX[level]}`,
      version: request.version,
      level,
      nodes: [],
      dependencies: [],
    },
  };
}
