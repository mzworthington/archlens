const WORKSPACE_PATH = '/workspace';
const WORKSPACE_PREFIX = `${WORKSPACE_PATH}/`;

export function isWorkspacePath(pathname: string): boolean {
  return pathname === WORKSPACE_PATH || pathname.startsWith(WORKSPACE_PREFIX);
}

export function workspaceEntityRefFromPath(pathname: string): string | undefined {
  if (!pathname.startsWith(WORKSPACE_PREFIX)) return undefined;
  const rest = pathname.slice(WORKSPACE_PREFIX.length).replace(/\/$/, '');
  return rest ? decodeURIComponent(rest) : undefined;
}

export function workspaceEntityRefFromRouteParam(
  pathAfterWorkspace: string | undefined
): string | undefined {
  const trimmed = pathAfterWorkspace?.replace(/^\/+/, '').replace(/\/$/, '');
  return trimmed ? decodeURIComponent(trimmed) : undefined;
}

export function buildWorkspacePath(scopeEntityRef?: string | null): string {
  return scopeEntityRef ? `${WORKSPACE_PATH}/${scopeEntityRef}` : WORKSPACE_PATH;
}
