import {
  buildWorkspacePath,
  isWorkspacePath,
  workspaceEntityRefFromPath,
} from '../../../application/navigation/workspaceUrl';

export type AdviceLensUrlState = {
  /** Entity ref in the workspace path — scopes ranked results to this subtree. */
  entityRef?: string;
  /** When set, opens the refactor plan slide-over for this offender. */
  planEntityRef?: string;
  showSource: boolean;
};

export type AdviceLensUrlOptions = {
  planEntityRef?: string | null;
  showSource?: boolean;
};

/** Canonical in-app entry for AdviceLens estate recommendations. */
export const ADVICELENS_ENTRY_URL = '/workspace?lens=advicelens';

export function isAdviceLensUrl(pathname: string, search = ''): boolean {
  if (!isWorkspacePath(pathname)) return false;
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  return params.get('lens') === 'advicelens';
}

export function buildAdviceLensPath(scopeEntityRef?: string | null): string {
  return buildWorkspacePath(scopeEntityRef);
}

export function buildAdviceLensUrl(
  scopeEntityRef?: string | null,
  options: AdviceLensUrlOptions = {}
): string {
  const path = buildAdviceLensPath(scopeEntityRef);
  const params = new URLSearchParams();
  params.set('lens', 'advicelens');
  if (options.planEntityRef) params.set('plan', options.planEntityRef);
  if (options.showSource) params.set('source', '1');
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function parseAdviceLensUrl(pathname: string, search = ''): AdviceLensUrlState {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const showSource = params.get('source') === '1';
  const planEntityRef = params.get('plan') ?? undefined;
  const entityRef = workspaceEntityRefFromPath(pathname);

  return { entityRef, planEntityRef, showSource };
}

export function isEstateLensUrl(pathname: string, search = ''): boolean {
  return isAdviceLensUrl(pathname, search) || isWorkspaceTraceLensUrl(pathname, search);
}

/** TraceLens offenders lens only (not AdviceLens). */
export function isWorkspaceTraceLensUrl(pathname: string, search = ''): boolean {
  if (!isWorkspacePath(pathname)) return false;
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  return params.get('lens') === 'tracelens' && params.get('view') !== 'recommendations';
}
