export type TraceLensView = 'offenders' | 'recommendations';

export type TraceLensUrlState = {
  /** Entity ref in the path — scopes ranked results to this subtree. */
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
export const ADVICELENS_ENTRY_URL = '/tracelens?view=recommendations';

const TRACE_LENS_PREFIX = '/tracelens/';

export function buildTraceLensPath(scopeEntityRef?: string | null): string {
  return scopeEntityRef ? `${TRACE_LENS_PREFIX}${scopeEntityRef}` : '/tracelens';
}

export function buildTraceLensUrl(
  scopeEntityRef?: string | null,
  options: TraceLensUrlOptions | boolean = {}
): string {
  const opts: TraceLensUrlOptions =
    typeof options === 'boolean' ? { showSource: options } : options;
  const path = buildTraceLensPath(scopeEntityRef);
  const params = new URLSearchParams();
  if (opts.planEntityRef) params.set('plan', opts.planEntityRef);
  if (opts.showSource) params.set('source', '1');
  if (opts.view === 'recommendations') params.set('view', 'recommendations');
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function parseTraceLensPath(pathname: string): Pick<TraceLensUrlState, 'entityRef'> {
  if (pathname === '/tracelens' || pathname === '/tracelens/') {
    return {};
  }

  if (pathname.startsWith(TRACE_LENS_PREFIX)) {
    const entityRef = pathname.slice(TRACE_LENS_PREFIX.length).replace(/\/$/, '');
    if (entityRef) return { entityRef };
  }

  return {};
}

export function parseTraceLensUrl(pathname: string, search = ''): TraceLensUrlState {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const showSource = params.get('source') === '1';
  const planEntityRef = params.get('plan') ?? undefined;
  const view = params.get('view') === 'recommendations' ? 'recommendations' : undefined;
  return { ...parseTraceLensPath(pathname), planEntityRef, showSource, view };
}

export function currentTraceLensUrl(pathname: string, search = ''): string {
  if (!search) return pathname;
  return `${pathname}?${search.startsWith('?') ? search.slice(1) : search}`;
}
