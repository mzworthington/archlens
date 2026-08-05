import {
  buildWorkspacePath,
  isWorkspacePath,
  workspaceEntityRefFromPath,
} from '../../../application/navigation/workspaceUrl';

export type TraceLensUrlState = {
  /** Entity ref in the workspace path — scopes ranked results to this subtree. */
  entityRef?: string;
  /** When set, opens the refactor plan slide-over for this offender. */
  planEntityRef?: string;
  showSource: boolean;
};

export type TraceLensUrlOptions = {
  planEntityRef?: string | null;
  showSource?: boolean;
};

export function isTraceLensUrl(pathname: string, search = ''): boolean {
  if (!isWorkspacePath(pathname)) return false;
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  return params.get('lens') === 'tracelens' && params.get('view') !== 'recommendations';
}

export function buildTraceLensPath(scopeEntityRef?: string | null): string {
  return buildWorkspacePath(scopeEntityRef);
}

export function buildTraceLensUrl(
  scopeEntityRef?: string | null,
  options: TraceLensUrlOptions | boolean = {}
): string {
  const opts: TraceLensUrlOptions =
    typeof options === 'boolean' ? { showSource: options } : options;
  const path = buildTraceLensPath(scopeEntityRef);
  const params = new URLSearchParams();
  params.set('lens', 'tracelens');
  if (opts.planEntityRef) params.set('plan', opts.planEntityRef);
  if (opts.showSource) params.set('source', '1');
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function parseTraceLensUrl(pathname: string, search = ''): TraceLensUrlState {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const showSource = params.get('source') === '1';
  const planEntityRef = params.get('plan') ?? undefined;
  const entityRef = workspaceEntityRefFromPath(pathname);

  return { entityRef, planEntityRef, showSource };
}

export function currentTraceLensUrl(pathname: string, search = ''): string {
  if (!search) return pathname;
  return `${pathname}?${search.startsWith('?') ? search.slice(1) : search}`;
}
