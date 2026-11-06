import type { SystemSchema } from '../models/schema';
import {
  collabDocumentToSchema,
  schemaToCollabDocument,
  type CollabDocument,
} from './collabDocument';

export type CollabWorkspaceDiagramSeed = {
  path: string;
  schema: SystemSchema;
};

/** One live room. Each path is a diagram; edits to one path leave the others alone. */
export type CollabWorkspace = {
  diagrams: Record<string, CollabDocument>;
};

export function emptyCollabWorkspace(): CollabWorkspace {
  return { diagrams: {} };
}

export function collabWorkspaceFromSchemas(
  diagrams: readonly CollabWorkspaceDiagramSeed[]
): CollabWorkspace {
  const next: Record<string, CollabDocument> = {};
  for (const diagram of diagrams) {
    if (!diagram.path) continue;
    next[diagram.path] = schemaToCollabDocument(diagram.schema);
  }
  return { diagrams: next };
}

export function collabWorkspacePaths(workspace: CollabWorkspace): string[] {
  return Object.keys(workspace.diagrams).sort((left, right) => left.localeCompare(right));
}

/** The diagram at `path`, or null when that file is not in the room. */
export function schemaFromCollabWorkspace(
  workspace: CollabWorkspace,
  path: string
): SystemSchema | null {
  const document = workspace.diagrams[path];
  if (!document) return null;
  return collabDocumentToSchema(document);
}

/** Replace one diagram. Every other path is copied through unchanged. */
export function replaceCollabWorkspaceDiagram(
  workspace: CollabWorkspace,
  path: string,
  schema: SystemSchema
): CollabWorkspace {
  return {
    diagrams: {
      ...workspace.diagrams,
      [path]: schemaToCollabDocument(schema),
    },
  };
}

/**
 * First share copies local diagrams into an empty room.
 * A later join keeps each remote diagram and adds only local paths the room does not have.
 * One local file does not drop remote siblings and does not require them to exist on disk.
 */
export function mergeCollabWorkspaceJoin(
  remote: CollabWorkspace,
  local: readonly CollabWorkspaceDiagramSeed[]
): CollabWorkspace {
  const diagrams: Record<string, CollabDocument> = { ...remote.diagrams };
  for (const diagram of local) {
    if (!diagram.path || diagrams[diagram.path]) continue;
    diagrams[diagram.path] = schemaToCollabDocument(diagram.schema);
  }
  return { diagrams };
}

/**
 * Which diagram to show after join.
 * Prefer the open file when the room has it, then any other local file the room has.
 * A local file the room does not know stays open. Otherwise show the first room diagram.
 * Missing siblings are skipped — this never throws.
 */
export function collabWorkspaceFocusPath(
  workspace: CollabWorkspace,
  preferredPath: string | null,
  localPaths: readonly string[]
): string | null {
  if (preferredPath && workspace.diagrams[preferredPath]) return preferredPath;
  for (const path of localPaths) {
    if (workspace.diagrams[path]) return path;
  }
  if (preferredPath && localPaths.includes(preferredPath)) return preferredPath;
  const roomPaths = collabWorkspacePaths(workspace);
  return roomPaths[0] ?? preferredPath;
}
