import { useEffect } from 'react';
import { applyDocumentHead } from './applyDocumentHead';
import { resolvePageSeo } from './siteSeo';

/** Keep document head in sync with the active client route. */
export function usePageSeo(pathname: string): void {
  useEffect(() => {
    applyDocumentHead(resolvePageSeo(pathname));
  }, [pathname]);
}
