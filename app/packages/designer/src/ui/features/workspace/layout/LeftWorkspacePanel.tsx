import React from 'react';
import { useBlueprintStore } from '../../../../application/store/store';
import { WorkspacePanelShell } from './WorkspacePanelShell';
import { LeftPanelTabs } from './LeftPanelTabs';
import { CodeViewerContent } from '../components/CodeViewer/CodeViewerContent';
import { TraceLensSidePanelContent } from '../../tracelens/TraceLensSidePanelContent';

export const LeftWorkspacePanel: React.FC = () => {
  const { leftCollapsed, activeLeftPanel, setActiveLeftPanel, toggleLeftCollapsed } =
    useBlueprintStore();

  return (
    <WorkspacePanelShell
      panelId="codeViewer"
      slot="left"
      title="Explorer"
      collapsed={leftCollapsed}
      onToggleCollapse={toggleLeftCollapsed}
      closeAriaLabel="Close Explorer"
      testId="left-panel"
      bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden"
    >
      <LeftPanelTabs activeTab={activeLeftPanel} onTabChange={setActiveLeftPanel} />
      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        role="tabpanel"
        aria-label={activeLeftPanel === 'traceLens' ? 'TraceLens' : 'Schema'}
      >
        {activeLeftPanel === 'traceLens' ? <TraceLensSidePanelContent /> : <CodeViewerContent />}
      </div>
    </WorkspacePanelShell>
  );
};
