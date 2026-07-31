/** Workspace URL helpers for bundled demo mode (entity-ref paths, same as folder workspaces). */

export function buildWorkspaceEntityHref(entityRef: string): string {
  return `/workspace/${entityRef}`;
}
