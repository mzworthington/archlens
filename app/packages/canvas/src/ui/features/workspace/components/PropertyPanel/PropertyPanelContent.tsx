import React from 'react';
import { ResilienceSection } from './ResilienceSection';
import { PropertyPanelPropertiesMode } from './PropertyPanelPropertiesMode';
import type { PropertyPanelModel } from './usePropertyPanelModel';

export const PropertyPanelContent: React.FC<{ model: PropertyPanelModel }> = ({ model }) => (
  <div className="space-y-6">
    {model.showSimulationPanel ? (
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
      />
    ) : null}

    {model.showPropertiesPanel ? <PropertyPanelPropertiesMode model={model} /> : null}
  </div>
);
