import React from 'react';
import { useLocation, useSearch } from 'wouter';
import { AppHeader } from '../../../../components/AppHeader';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { useBlueprintStore } from '../../../../../application/store/store';
import { buildTraceLensUrl } from '../../../forensics/traceLensUrl';
import {
  buildAdviceLensUrl,
  isAdviceLensUrl,
  isEstateLensUrl,
  isWorkspaceTraceLensUrl,
} from '../../../forensics/adviceLensUrl';
import { workspaceEntityRefFromPath } from '../../../../../application/navigation/workspaceUrl';
import type { BrandLensTab } from '../../../../components/AppHeader/BrandMark';

export const Header: React.FC = () => {
  const [location] = useLocation();
  const search = useSearch();
  const isResilienceMode = useBlueprintStore(s => s.isResilienceMode);
  const onEstateLens = isEstateLensUrl(location, search);
  const entityRef = workspaceEntityRefFromPath(location) ?? undefined;

  const lensTabs: BrandLensTab[] | undefined = onEstateLens
    ? [
        {
          label: 'TRACELENS',
          href: buildTraceLensUrl(entityRef),
          active: isWorkspaceTraceLensUrl(location, search),
        },
        {
          label: 'ADVICELENS',
          href: buildAdviceLensUrl(entityRef),
          active: isAdviceLensUrl(location, search),
        },
      ]
    : undefined;

  const badge = onEstateLens ? undefined : isResilienceMode ? 'CHAOSLENS' : 'CANVAS';

  return (
    <AppHeader badge={badge} lensTabs={lensTabs}>
      <div className="min-w-0 flex-1 border-l border-[#00f0ff]/15 pl-3 lg:pl-4">
        <Breadcrumbs />
      </div>
    </AppHeader>
  );
};
