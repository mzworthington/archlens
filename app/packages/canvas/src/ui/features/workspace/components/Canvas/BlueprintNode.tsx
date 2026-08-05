import React, { memo, useEffect } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';
import { useLocation } from 'wouter';
import type { NodeProps, Node } from '@xyflow/react';
import {
  listChildDiagramExternals,
  resolveChildDiagramEntry,
  resolveExternalNodeKind,
  type NodeType,
} from '@archlens/core';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { ComponentNodeData } from '../../../../../application/store/store';
import { evaluateForensicsConcern } from '../../../../../application/forensics/concern';
import { navigateToWorkspaceEntity } from '../../../../../application/navigation/navigateToWorkspaceEntity';
import { nodeTypeConfigs } from './blueprintNodeTypeConfigs';
import { BlueprintNodeBadges } from './BlueprintNodeBadges';
import {
  BlueprintNodeExternalSummaryHub,
  BlueprintNodeHandles,
  BlueprintNodeHeaderChrome,
  BlueprintNodeTitle,
  BlueprintNodeZoomButton,
} from './BlueprintNodeChrome';
import { BlueprintNodeBlastRipple } from './BlueprintNodeHeatOverlays';
import { blueprintNodeHeatStyle } from './blueprintNodeHeatStyle';

type CustomNode = Node<ComponentNodeData, 'blueprintNode'>;

export const BlueprintNode = memo(({ id, data, selected }: NodeProps<CustomNode>) => {
  const { type, name } = data;
  const config = nodeTypeConfigs[type as NodeType] || nodeTypeConfigs['rest-api'];

  const [, setLocation] = useLocation();
  const selectNode = useBlueprintStore(state => state.selectNode);
  const materializeCouplingGhost = useBlueprintStore(state => state.materializeCouplingGhost);
  const workspaceCatalog = useBlueprintStore(state => state.workspaceCatalog);
  const loadedSystems = useBlueprintStore(state => state.loadedSystems);
  const openSourceCodeDialog = useBlueprintStore(state => state.openSourceCodeDialog);
  const diagramSource = useBlueprintStore(state => state.schema.source);
  const liteCanvas = useBlueprintStore(state => state.liteCanvas);
  const entityRef = data.entityRef;
  const canZoom = entityRef ? !!resolveChildDiagramEntry(workspaceCatalog, entityRef) : false;
  const childExternalsCount =
    canZoom && entityRef
      ? listChildDiagramExternals(workspaceCatalog, loadedSystems, entityRef).length
      : 0;
  const sourceFilepath =
    typeof data.properties?.filepath === 'string' ? data.properties.filepath : undefined;
  const showSourceCodeButton = Boolean(sourceFilepath) && !canZoom;
  const updateNodeInternals = useUpdateNodeInternals();

  const zoomToChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entityRef) return;
    navigateToWorkspaceEntity(entityRef, { workspaceCatalog, setLocation });
  };

  // Keep edge endpoints attached after lite-canvas chrome height changes.
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, liteCanvas, updateNodeInternals]);

  const concern = React.useMemo(() => evaluateForensicsConcern(data.forensics), [data.forensics]);
  const classifications = data.forensics?.classifications ?? [];
  const externalKind = data.external
    ? resolveExternalNodeKind({ external: data.external, properties: data.properties })
    : null;
  const showHotBadge = classifications.includes('hotspot') || concern.level === 'danger';
  const showSiloBadge =
    classifications.includes('knowledge-silo') ||
    (concern.level === 'warning' && concern.reasons.some(r => /silo/i.test(r)));
  const hotspotHeat = typeof data.hotspotHeat === 'number' ? data.hotspotHeat : 0;
  const blastHeat = typeof data.blastHeat === 'number' ? data.blastHeat : 0;
  const integrityHeat = typeof data.integrityHeat === 'number' ? data.integrityHeat : 0;
  const showHotspotHeat = hotspotHeat > 0.08;
  const showAvailabilityRisk = blastHeat > 0.08;
  const showIntegrityRisk = integrityHeat > 0.08;
  const showRiskVisualization = showHotspotHeat || showAvailabilityRisk || showIntegrityRisk;
  const availabilityScore = Math.round((1 - blastHeat) * 100);
  const integrityScore = Math.round((1 - integrityHeat) * 100);
  const showBlastRipple = Boolean(data.blastRipple) && !liteCanvas;
  const isOutOfSimulationScope = Boolean(data.resilienceOutOfScope);
  const activeSafeguards = data.resilienceSafeguards;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.hiddenExternalGhost) return;
    selectNode(id);
  };

  const concernBorder =
    concern.level === 'danger'
      ? 'border-red-800/80'
      : concern.level === 'warning'
        ? 'border-amber-800/80'
        : null;

  const solidBg = showHotspotHeat ? 'bg-transparent' : 'bg-slate-950';
  const borderClass = data.hiddenExternalGhost
    ? 'border-dashed border-cyan-500/70 bg-cyan-950/30 hover:border-cyan-400/80'
    : data.couplingGhost
      ? 'border-dashed border-amber-500/70 bg-amber-950/30 hover:border-amber-400/80'
      : data.external
        ? 'border-dashed border-cyan-600/70 bg-cyan-950 hover:border-cyan-500/80'
        : data.isResilienceFaultTarget
          ? 'border-red-500/80 bg-slate-900'
          : selected
            ? 'border-brand-500 bg-slate-900 scale-102'
            : data.dependencyRole === 'upstream'
              ? 'border-violet-500/70 bg-slate-900'
              : data.dependencyRole === 'downstream'
                ? 'border-emerald-500/70 bg-slate-900'
                : data.couplingHighlight
                  ? 'border-amber-500/70 bg-slate-900'
                  : data.refactorBoundaryHighlight
                    ? 'border-violet-500/70 bg-slate-900'
                    : activeSafeguards
                      ? 'border-emerald-500/75 bg-slate-900 hover:border-emerald-400/80'
                      : concernBorder
                        ? `${concernBorder} ${solidBg} hover:border-slate-700`
                        : `${solidBg} border-slate-800 hover:border-slate-700`;

  const resilienceTitle =
    showAvailabilityRisk || showIntegrityRisk
      ? [
          showAvailabilityRisk ? `Availability ${availabilityScore}%` : null,
          showIntegrityRisk ? `Integrity ${integrityScore}%` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : name;

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
      onClick={handleClick}
      title={resilienceTitle}
      data-coupling-highlight={data.couplingHighlight ? 'true' : undefined}
      data-hotspot-heat={showHotspotHeat ? hotspotHeat.toFixed(2) : undefined}
      data-availability-heat={showAvailabilityRisk ? blastHeat.toFixed(2) : undefined}
      data-integrity-heat={showIntegrityRisk ? integrityHeat.toFixed(2) : undefined}
      data-testid={
        liteCanvas
          ? 'blueprint-node-simplified'
          : activeSafeguards
            ? 'resilience-safeguard-node'
            : showRiskVisualization
              ? 'hotspot-heat'
              : 'blueprint-node'
      }
      className={`relative w-64 rounded-xl border p-4 cursor-pointer ${
        liteCanvas ? '' : 'transition-colors duration-150'
      } ${borderClass} ${showBlastRipple ? 'blast-ripple-node' : ''} ${
        isOutOfSimulationScope ? 'opacity-35 saturate-50' : ''
      }`}
      style={blueprintNodeHeatStyle({
        selected,
        external: data.external,
        couplingHighlight: data.couplingHighlight,
        liteCanvas,
        isOutOfSimulationScope,
        showAvailabilityRisk,
        showIntegrityRisk,
        showHotspotHeat,
        hotspotHeat,
        blastHeat,
        integrityHeat,
      })}
    >
      <BlueprintNodeBlastRipple show={showBlastRipple} />
      <BlueprintNodeHandles />

      {liteCanvas && canZoom ? (
        <div className="absolute top-2 right-2">
          <BlueprintNodeZoomButton name={name} liteCanvas onZoom={zoomToChild} />
        </div>
      ) : null}

      {!liteCanvas && (
        <BlueprintNodeHeaderChrome
          config={config}
          name={name}
          entityRef={entityRef}
          canZoom={canZoom}
          childExternalsCount={childExternalsCount}
          showSourceCodeButton={showSourceCodeButton}
          sourceFilepath={sourceFilepath}
          diagramSource={diagramSource}
          isExternal={data.external}
          isCouplingGhost={data.couplingGhost}
          couplingGhostPosition={data.couplingGhostPosition}
          onViewSource={openSourceCodeDialog}
          onMaterializeGhost={materializeCouplingGhost}
          onZoom={zoomToChild}
        />
      )}

      <BlueprintNodeTitle
        name={name}
        id={id}
        entityRef={data.entityRef}
        liteCanvas={liteCanvas}
        hiddenExternalGhost={data.hiddenExternalGhost}
        couplingGhost={data.couplingGhost}
        externalKind={externalKind}
      />

      {!liteCanvas && (
        <BlueprintNodeBadges
          typeLabel={config.label}
          showHotBadge={showHotBadge}
          showSiloBadge={showSiloBadge}
          couplingHighlight={data.couplingHighlight}
          refactorBoundaryHighlight={data.refactorBoundaryHighlight}
          dependencyRole={data.dependencyRole}
          activeSafeguards={activeSafeguards}
          showAvailabilityRisk={showAvailabilityRisk}
          showIntegrityRisk={showIntegrityRisk}
          isTest={data.isTest}
        />
      )}
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
