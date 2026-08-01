export type TraceLensView = 'offenders' | 'recommendations';

export type TraceLensUrlState = {
  /** Entity ref in the workspace path — scopes ranked results to this subtree. */
  entityRef?: string;
  /** When set, opens the refactor plan slide-over for this offender. */
  planEntityRef?: string;
  showSource: boolean;
  /** AdviceLens estate recommendations tab. */
  view?: TraceLensView;
};

export type TraceLensUrlOptions = {
  planEntityRef?: string | null;
  showSource?: boolean;
  view?: TraceLensView | null;
};

/** Canonical in-app entry for AdviceLens (estate recommendations in TraceLens). */
export const ADVICELENS_ENTRY_URL = '/workspace?lens=tracelens&view=recommendations';

const LEGACY_TRACE_LENS_PREFIX = '/tracelens/';
const WORKSPACE_PREFIX = '/workspace/';

export function workspaceEntityRefFromPath(pathname: string): string | undefined {
  if (!pathname.startsWith(WORKSPACE_PREFIX)) return undefined;
  const rest = pathname.slice(WORKSPACE_PREFIX.length).replace(/\/$/, '');
  return rest ? decodeURIComponent(rest) : undefined;
}

export function isTraceLensUrl(pathname: string, search = ''): boolean {
  if (pathname === '/tracelens' || pathname.startsWith(LEGACY_TRACE_LENS_PREFIX)) {
    return true;
  }
  if (pathname !== '/workspace' && !pathname.startsWith(WORKSPACE_PREFIX)) {
    return false;
  }
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('lens') === 'tracelens';
}

export function buildTraceLensPath(scopeEntityRef?: string | null): string {
  return scopeEntityRef ? `/workspace/${scopeEntityRef}` : '/workspace';
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
  if (opts.view === 'recommendations') params.set('view', 'recommendations');
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Map legacy `/tracelens` paths to workspace lens URLs. */
export function redirectLegacyTraceLensUrl(pathname: string, search = ''): string {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const existing = new URLSearchParams(query);

  let entityRef: string | undefined;
  if (pathname.startsWith(LEGACY_TRACE_LENS_PREFIX)) {
    const rest = pathname.slice(LEGACY_TRACE_LENS_PREFIX.length).replace(/\/$/, '');
    if (rest) entityRef = decodeURIComponent(rest);
  }

  const path = buildTraceLensPath(entityRef);
  const params = new URLSearchParams();
  params.set('lens', 'tracelens');
  for (const [key, value] of existing) {
    if (key !== 'lens') params.append(key, value);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function parseTraceLensUrl(pathname: string, search = ''): TraceLensUrlState {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const showSource = params.get('source') === '1';
  const planEntityRef = params.get('plan') ?? undefined;
  const view = params.get('view') === 'recommendations' ? 'recommendations' : undefined;

  let entityRef = workspaceEntityRefFromPath(pathname);
  if (!entityRef && pathname.startsWith(LEGACY_TRACE_LENS_PREFIX)) {
    const rest = pathname.slice(LEGACY_TRACE_LENS_PREFIX.length).replace(/\/$/, '');
    if (rest) entityRef = decodeURIComponent(rest);
  }

  return { entityRef, planEntityRef, showSource, view };
}

export function currentTraceLensUrl(pathname: string, search = ''): string {
  if (!search) return pathname;
  return `${pathname}?${search.startsWith('?') ? search.slice(1) : search}`;
}
