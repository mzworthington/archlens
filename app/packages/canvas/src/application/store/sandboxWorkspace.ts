/** Workspace URL helpers for bundled demo mode (entity-ref paths, same as folder workspaces). */

import { buildTraceLensUrl, isTraceLensUrl } from '../../ui/features/forensics/traceLensUrl';
import { buildAdviceLensUrl, isAdviceLensUrl } from '../../ui/features/forensics/adviceLensUrl';
import { buildChaosLensUrl, isChaosLensUrl, parseChaosLensUrl } from '../resilience/chaosLensUrl';

export type WorkspaceEntityHrefOptions = {
  pathname?: string;
  search?: string;
};

export function buildWorkspaceEntityHref(
  entityRef: string,
  options?: WorkspaceEntityHrefOptions
): string {
  const pathname =
    options?.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/workspace');
  const search = options?.search ?? (typeof window !== 'undefined' ? window.location.search : '');

  if (isAdviceLensUrl(pathname, search)) {
    return buildAdviceLensUrl(entityRef);
  }

  if (isTraceLensUrl(pathname, search)) {
    return buildTraceLensUrl(entityRef);
  }

  if (isChaosLensUrl(pathname, search)) {
    const parsed = parseChaosLensUrl(pathname, search);
    return buildChaosLensUrl(entityRef, {
      faults: parsed.faults,
      browseChaosSpecs: parsed.browseChaosSpecs,
    });
  }

  return `/workspace/${entityRef}`;
}
