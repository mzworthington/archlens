import React from 'react';
import { useLocation, useSearch } from 'wouter';
import { AppHeader } from '../../../../components/AppHeader';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { useBlueprintStore } from '../../../../../application/store/store';
import { isAdviceLensUrl, isWorkspaceTraceLensUrl } from '../../../forensics/adviceLensUrl';

export const Header: React.FC = () => {
  const [location] = useLocation();
  const search = useSearch();
  const isResilienceMode = useBlueprintStore(s => s.isResilienceMode);

  const badge = isAdviceLensUrl(location, search)
    ? 'ADVICELENS'
    : isWorkspaceTraceLensUrl(location, search)
      ? 'TRACELENS'
      : isResilienceMode
        ? 'CHAOSLENS'
        : 'CANVAS';

  return (
    <AppHeader badge={badge}>
      <div className="min-w-0 flex-1 border-l border-[#00f0ff]/15 pl-3 lg:pl-4">
        <Breadcrumbs />
      </div>
    </AppHeader>
  );
};
