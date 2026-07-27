import React from 'react';
import { AppHeader } from '../../../../components/AppHeader';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { BreadcrumbsCompact } from '../Breadcrumbs/BreadcrumbsCompact';
import { useBlueprintStore } from '../../../../../application/store/store';

export const Header: React.FC = () => {
  const isResilienceMode = useBlueprintStore(s => s.isResilienceMode);

  return (
    <AppHeader badge={isResilienceMode ? 'CHAOSLENS' : 'CANVAS'}>
      <div className="min-w-0 hidden lg:block border-l border-[#00f0ff]/15 pl-4 flex-1">
        <Breadcrumbs />
      </div>
      <div className="min-w-0 flex-1 lg:hidden border-l border-[#00f0ff]/15 pl-3">
        <BreadcrumbsCompact />
      </div>
    </AppHeader>
  );
};
