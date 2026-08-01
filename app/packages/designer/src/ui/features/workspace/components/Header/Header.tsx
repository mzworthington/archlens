import React from 'react';
import { AppHeader } from '../../../../components/AppHeader';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { useBlueprintStore } from '../../../../../application/store/store';

export const Header: React.FC = () => {
  const isResilienceMode = useBlueprintStore(s => s.isResilienceMode);

  return (
    <AppHeader badge={isResilienceMode ? 'CHAOSLENS' : 'CANVAS'}>
      <div className="min-w-0 flex-1 border-l border-[#00f0ff]/15 pl-3 lg:pl-4">
        <Breadcrumbs />
      </div>
    </AppHeader>
  );
};
