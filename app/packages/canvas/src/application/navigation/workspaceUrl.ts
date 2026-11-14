const WORKSPACE_PATH = '/workspace';
const WORKSPACE_PREFIX = `${WORKSPACE_PATH}/`;
const CREATE_BLANK_PARAM = 'new';

export const CREATE_BLANK_WORKSPACE_URL = `${WORKSPACE_PATH}?${CREATE_BLANK_PARAM}=1`;

function queryFromSearch(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

export function isCreateBlankWorkspaceSearch(search: string): boolean {
  const value = queryFromSearch(search).get(CREATE_BLANK_PARAM)?.trim();
  return value === '1' || value === 'true';
}

export function withoutCreateBlankWorkspaceSearch(pathname: string, search: string): string {
  const params = queryFromSearch(search);
  params.delete(CREATE_BLANK_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

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
