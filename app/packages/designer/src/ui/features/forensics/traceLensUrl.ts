export type TraceLensUrlState = {
  entityRef?: string;
  showSource: boolean;
};

const TRACE_LENS_PREFIX = '/tracelens/';

export function buildTraceLensPath(entityRef?: string | null): string {
  return entityRef ? `${TRACE_LENS_PREFIX}${entityRef}` : '/tracelens';
}

export function buildTraceLensUrl(entityRef?: string | null, showSource = false): string {
  const path = buildTraceLensPath(entityRef);
  return showSource ? `${path}?source=1` : path;
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
  const showSource = new URLSearchParams(query).get('source') === '1';
  return { ...parseTraceLensPath(pathname), showSource };
}

export function currentTraceLensUrl(pathname: string, search = ''): string {
  if (!search) return pathname;
  return `${pathname}?${search.startsWith('?') ? search.slice(1) : search}`;
}
