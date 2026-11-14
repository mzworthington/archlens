import React, { memo, useEffect } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';
import { useLocation } from 'wouter';
import type { NodeProps, Node } from '@xyflow/react';
import type { NodeType } from '@archlens/core';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { ComponentNodeData } from '../../../../../application/store/store';
import { evaluateForensicsConcern } from '../../../../../application/forensics/concern';
import { navigateToWorkspaceEntity } from '../../../../../application/navigation/navigateToWorkspaceEntity';
import { nodeTypeConfigs } from './blueprintNodeTypeConfigs';
import { BlueprintNodeBadges } from './BlueprintNodeBadges';
import {
  BlueprintNodeExternalSummaryHub,
  BlueprintNodeHandles,
  BlueprintNodeCreateZoomButton,
  BlueprintNodeHeaderChrome,
  BlueprintNodeTitle,
  BlueprintNodeZoomButton,
} from './BlueprintNodeChrome';
import { BlueprintNodeBlastRipple } from './BlueprintNodeHeatOverlays';
import { blueprintNodeHeatStyle } from './blueprintNodeHeatStyle';
import { resolveBlueprintNodeVisualState } from './blueprintNodeVisualState';
import { NodeCommentMarker } from './NodeCommentMarker';

type CustomNode = Node<ComponentNodeData, 'blueprintNode'>;

export const BlueprintNode = memo(({ id, data, selected }: NodeProps<CustomNode>) => {
  const { type, name } = data;
  const config = nodeTypeConfigs[type as NodeType] || nodeTypeConfigs['rest-api'];

  const [, setLocation] = useLocation();
  const selectNode = useBlueprintStore(state => state.selectNode);
  const createChildZoom = useBlueprintStore(state => state.createChildZoom);
  const materializeCouplingGhost = useBlueprintStore(state => state.materializeCouplingGhost);
  const workspaceCatalog = useBlueprintStore(state => state.workspaceCatalog);
  const loadedSystems = useBlueprintStore(state => state.loadedSystems);
  const openSourceCodeDialog = useBlueprintStore(state => state.openSourceCodeDialog);
  const diagramSource = useBlueprintStore(state => state.schema.source);
  const liteCanvas = useBlueprintStore(state => state.liteCanvas);
  const entityRef = data.entityRef;
  const updateNodeInternals = useUpdateNodeInternals();

  const zoomToChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entityRef) return;
    navigateToWorkspaceEntity(entityRef, { workspaceCatalog, setLocation });
  };

  const createZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entityRef) return;
    void createChildZoom(entityRef).then(created => {
      if (!created) return;
      navigateToWorkspaceEntity(entityRef, {
        workspaceCatalog: useBlueprintStore.getState().workspaceCatalog,
        setLocation,
      });
    });
  };

  // Keep edge endpoints attached after lite-canvas chrome height changes.
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, liteCanvas, updateNodeInternals]);

  const concern = React.useMemo(() => evaluateForensicsConcern(data.forensics), [data.forensics]);
  const visual = resolveBlueprintNodeVisualState({
    data,
    selected,
    liteCanvas,
    concern,
    workspaceCatalog,
    loadedSystems,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.hiddenExternalGhost) return;
    selectNode(id);
  };

  if (data.externalSummaryHub) {
    const band = data.externalSummaryBand === 'callers' ? 'callers' : 'targets';
    return (
      <BlueprintNodeExternalSummaryHub
        band={band}
        count={data.externalSummaryCount ?? 0}
        onClick={handleClick}
      />
    );
  }

  return (
    <div
      title={visual.resilienceTitle}
      className={`relative w-64 rounded-xl border p-4 cursor-pointer ${
        liteCanvas ? '' : 'transition-colors duration-150'
      } ${visual.borderClass} ${visual.showBlastRipple ? 'blast-ripple-node' : ''} ${
        visual.isOutOfSimulationScope ? 'opacity-35 saturate-50' : ''
      }`}
      style={blueprintNodeHeatStyle({
        selected,
        external: data.external,
        couplingHighlight: data.couplingHighlight,
        liteCanvas,
        isOutOfSimulationScope: visual.isOutOfSimulationScope,
        showAvailabilityRisk: visual.showAvailabilityRisk,
        showIntegrityRisk: visual.showIntegrityRisk,
        showHotspotHeat: visual.showHotspotHeat,
        hotspotHeat: visual.hotspotHeat,
        blastHeat: visual.blastHeat,
        integrityHeat: visual.integrityHeat,
      })}
    >
      <NodeCommentMarker entityRef={entityRef} />
      <button
        type="button"
        aria-label={name}
        onClick={handleClick}
        data-coupling-highlight={data.couplingHighlight ? 'true' : undefined}
        data-hotspot-heat={visual.showHotspotHeat ? visual.hotspotHeat.toFixed(2) : undefined}
        data-availability-heat={
          visual.showAvailabilityRisk ? visual.blastHeat.toFixed(2) : undefined
        }
        data-integrity-heat={visual.showIntegrityRisk ? visual.integrityHeat.toFixed(2) : undefined}
        data-testid={visual.testId}
        className="absolute inset-0 z-0 border-0 bg-transparent p-0 cursor-pointer"
      />
      <div className="relative z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <BlueprintNodeBlastRipple show={visual.showBlastRipple} />
          <BlueprintNodeHandles />
        </div>

        {liteCanvas && visual.canZoom ? (
          <div className="absolute top-2 right-2 pointer-events-auto">
            <BlueprintNodeZoomButton name={name} liteCanvas onZoom={zoomToChild} />
          </div>
        ) : null}

        {liteCanvas && visual.canCreateZoom ? (
          <div className="absolute top-2 right-2 pointer-events-auto">
            <BlueprintNodeCreateZoomButton name={name} liteCanvas onCreateZoom={createZoom} />
          </div>
        ) : null}

        {!liteCanvas && (
          <div className="pointer-events-auto">
            <BlueprintNodeHeaderChrome
              config={config}
              name={name}
              entityRef={entityRef}
              canZoom={visual.canZoom}
              canCreateZoom={visual.canCreateZoom}
              childExternalsCount={visual.childExternalsCount}
              showSourceCodeButton={visual.showSourceCodeButton}
              sourceFilepath={visual.sourceFilepath}
              diagramSource={diagramSource}
              isExternal={data.external}
              isCouplingGhost={data.couplingGhost}
              couplingGhostPosition={data.couplingGhostPosition}
              onViewSource={openSourceCodeDialog}
              onMaterializeGhost={materializeCouplingGhost}
              onZoom={zoomToChild}
              onCreateZoom={createZoom}
            />
          </div>
        )}

        <BlueprintNodeTitle
          name={name}
          id={id}
          entityRef={data.entityRef}
          liteCanvas={liteCanvas}
          hiddenExternalGhost={data.hiddenExternalGhost}
          couplingGhost={data.couplingGhost}
          externalKind={visual.externalKind}
        />

        {!liteCanvas && (
          <BlueprintNodeBadges
            typeLabel={config.label}
            showHotBadge={visual.showHotBadge}
            showSiloBadge={visual.showSiloBadge}
            couplingHighlight={data.couplingHighlight}
            refactorBoundaryHighlight={data.refactorBoundaryHighlight}
            dependencyRole={data.dependencyRole}
            activeSafeguards={data.resilienceSafeguards}
            showAvailabilityRisk={visual.showAvailabilityRisk}
            showIntegrityRisk={visual.showIntegrityRisk}
            isTest={data.isTest}
          />
        )}
      </div>
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
