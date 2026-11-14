import React, { useRef } from 'react';
import { useLocation } from 'wouter';
import { useShallow } from 'zustand/react/shallow';
import { useBlueprintStore } from '../../../../application/store/store';
import { stripChaosLensSearch } from '../../../../application/resilience/chaosLensUrl';
import { useModalFocusTrap } from '../../../a11y/useModalFocusTrap';
import { WorkspacePanelShell } from './WorkspacePanelShell';
import { LeftPanelTabs } from './LeftPanelTabs';
import { CodeViewerContent } from '../components/CodeViewer/CodeViewerContent';
import { TraceLensSidePanelContent } from '../../tracelens/TraceLensSidePanelContent';
import { ResilienceSection } from '../components/PropertyPanel/ResilienceSection';
import { usePropertyPanelModel } from '../components/PropertyPanel/usePropertyPanelModel';

export const LeftWorkspacePanel: React.FC = () => {
  const {
    leftCollapsed,
    activeLeftPanel,
    setActiveLeftPanel,
    toggleLeftCollapsed,
    isResilienceMode,
    setResilienceMode,
  } = useBlueprintStore(
    useShallow(s => ({
      leftCollapsed: s.leftCollapsed,
      activeLeftPanel: s.activeLeftPanel,
      setActiveLeftPanel: s.setActiveLeftPanel,
      toggleLeftCollapsed: s.toggleLeftCollapsed,
      isResilienceMode: s.isResilienceMode,
      setResilienceMode: s.setResilienceMode,
    }))
  );
  const [, setLocation] = useLocation();
  const resilienceRef = useRef<HTMLDivElement>(null);
  const resilienceTrapped = isResilienceMode && activeLeftPanel === 'chaosLens' && !leftCollapsed;
  useModalFocusTrap(resilienceTrapped, resilienceRef, () => {
    setResilienceMode(false);
    const search = stripChaosLensSearch(window.location.search);
    setLocation(`${window.location.pathname}${search}`, { replace: true });
  });

  const model = usePropertyPanelModel();

  const handleTabChange = (panel: typeof activeLeftPanel) => {
    if (isResilienceMode && panel !== 'chaosLens') {
      useBlueprintStore.getState().setResilienceMode(false);
    }
    setActiveLeftPanel(panel);
  };

  const activeTab = activeLeftPanel;

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
      <LeftPanelTabs activeTab={activeTab} onTabChange={handleTabChange} />
      <div
        ref={resilienceRef}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        role="tabpanel"
        aria-label={
          activeTab === 'chaosLens'
            ? 'Resilience'
            : activeTab === 'traceLens'
              ? 'TraceLens'
              : 'Schema'
        }
        tabIndex={-1}
      >
        {activeTab === 'chaosLens' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <ResilienceSection
              sampleMode={model.isSampleWorkspace}
              telemetryView={model.resilienceTelemetryView}
              schemaNodes={model.schema.nodes}
              selectedNodeId={model.selectedNodeId}
              selectedNodeLabel={model.isNode ? (model.selectedNode?.name ?? null) : null}
              chaosSpecMetadata={model.chaosSpecMetadata}
              faults={model.resilienceFaults}
              faultType={model.editorFaultType}
              severity={model.editorSeverity}
              safeguards={model.selectedResilienceSafeguards}
              monteCarlo={model.resilienceMonteCarlo}
              simulationResult={model.resilienceSimulationResult}
              pinnedBaseline={model.pinnedResilienceBaseline}
              recommendations={model.resilienceRecommendations}
              onTelemetryViewChange={model.setResilienceTelemetryView}
              onSelectFault={model.selectNode}
              onRemoveFault={model.removeResilienceFault}
              onFaultTypeChange={model.setResilienceFaultType}
              onSeverityChange={model.setResilienceSeverity}
              onSafeguardChange={model.handleSafeguardChange}
              onAddFaultToScenario={model.addResilienceFaultFromDraft}
              onMonteCarloChange={model.setResilienceMonteCarlo}
              onBrowseChaosSpecs={() => model.openChaosSpecPicker()}
              onLoadChaosSpec={() => model.openChaosSpecDialog('import')}
              onExportChaosSpec={() => model.openChaosSpecDialog('export')}
              onClearScenario={model.clearResilienceScenario}
              onPinBaseline={model.pinResilienceBaseline}
              onClearBaseline={model.clearPinnedResilienceBaseline}
            />
          </div>
        ) : activeTab === 'traceLens' ? (
          <TraceLensSidePanelContent />
        ) : (
          <CodeViewerContent />
        )}
      </div>
    </WorkspacePanelShell>
  );
};
