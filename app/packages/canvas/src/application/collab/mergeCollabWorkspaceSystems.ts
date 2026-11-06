import type { SystemSchema } from '@archlens/core';

export type LoadedCollabSystem = {
  path: string;
  name: string;
  schema: SystemSchema;
};

/**
 * Add room diagrams beside the files already open.
 * The active file stays under the canvas apply path so a sibling cannot replace it.
 * Local files the room has not seen are kept. Missing siblings are not an error.
 */
export function mergeLoadedSystemsWithRoom(
  local: readonly LoadedCollabSystem[],
  room: readonly { path: string; schema: SystemSchema }[],
  activePath: string | null
): LoadedCollabSystem[] {
  const next = new Map(local.map(system => [system.path, { ...system }]));
  for (const diagram of room) {
    if (!diagram.path) continue;
    const existing = next.get(diagram.path);
    if (diagram.path === activePath && existing) continue;
    const name =
      diagram.schema.name || existing?.name || diagram.path.split('/').pop() || diagram.path;
    next.set(diagram.path, { path: diagram.path, name, schema: diagram.schema });
  }
  return [...next.values()];
}
