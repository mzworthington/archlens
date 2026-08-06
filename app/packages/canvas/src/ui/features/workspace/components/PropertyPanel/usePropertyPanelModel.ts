import { useMemo, useState, type FormEvent } from 'react';
import type { C4Level, NodeType, PropertyMap } from '@archlens/core';
import { listChildDiagramExternals, resolveChildDiagramEntry } from '@archlens/core';
import type { NodeSafeguards } from '@archlens/core/resilience';
import { buildDependencyGraphModel } from '../../../../../application/forensics/filterSelectedDependencyFocus';
import { buildDiagramRecommendations } from '../../../../../application/recommendations/buildDiagramRecommendations';
import { useBlueprintStore } from '../../../../../application/store/store';
import { derivePropertyPanelView } from './derivePropertyPanelView';
import { planNodeNameUpdate } from './planNodeNameUpdate';

export function usePropertyPanelModel() {
  const {
    schema,
    selectedNodeId,
    selectedEdgeId,
    nodes,
    edges,
    validationResult,
    updateSchemaName,
    updateSchemaLevel,
    addNode,
    updateNode,
    deleteNode,
    selectNode,
    selectEdge,
    updateDependency,
    deleteDependency,
    rightCollapsed,
    toggleRightCollapsed,
    workspaceName,
    loadedSystems,
    workspaceCatalog,
    isResilienceMode,
    resilienceTelemetryView,
    resiliencePanelTab,
    setResilienceTelemetryView,
    setResiliencePanelTab,
    resilienceFaultType,
    resilienceSeverity,
    resilienceFaults,
    resilienceSafeguards,
    resilienceMonteCarlo,
    resilienceSimulationResult,
    chaosSpecMetadata,
    setResilienceFaultType,
    setResilienceSeverity,
    setResilienceSafeguard,
    setResilienceMonteCarlo,
    addResilienceFaultFromDraft,
    removeResilienceFault,
    openChaosSpecDialog,
    openChaosSpecPicker,
    clearResilienceScenario,
    isSampleWorkspace,
  } = useBlueprintStore();

  const [propKey, setPropKey] = useState('');
  const [propVal, setPropVal] = useState('');

  const selectedFault = selectedNodeId
    ? resilienceFaults.find(fault => fault.nodeId === selectedNodeId)
    : undefined;
  const editorFaultType = selectedFault?.faultType ?? resilienceFaultType;
  const editorSeverity = selectedFault?.severity ?? resilienceSeverity;

  const view = derivePropertyPanelView({
    schema,
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    workspaceName,
    isResilienceMode,
    resiliencePanelTab,
    resilienceSafeguards,
  });

  const {
    selectedRFNode,
    selectedNode,
    selectedEdge,
    edgeEndpointMissing,
    isNode,
    isEdge,
    showPropertiesPanel,
    showSimulationPanel,
    titleType,
    selectedResilienceSafeguards,
    nameValue,
    nameInputId,
    entityRefValue,
    entityRefInputId,
    selectId,
  } = view;

  const resilienceRecommendations = useMemo(
    () =>
      resilienceSimulationResult
        ? buildDiagramRecommendations({
            schema,
            simulation: resilienceSimulationResult,
            sessionSafeguards: resilienceSafeguards,
          })
        : [],
    [schema, resilienceSimulationResult, resilienceSafeguards]
  );

  const nodeConnections = edges.filter(
    edge => edge.source === selectedNodeId || edge.target === selectedNodeId
  );

  const dependencyGraphModel = useMemo(() => {
    if (!selectedNodeId) {
      return { upstream: [], downstream: [], upstreamTotal: 0, downstreamTotal: 0 };
    }
    return buildDependencyGraphModel(selectedNodeId, nodes, edges);
  }, [selectedNodeId, nodes, edges]);

  const childDiagramEntry = useMemo(() => {
    if (!selectedNode?.entityRef) return undefined;
    return resolveChildDiagramEntry(workspaceCatalog, selectedNode.entityRef);
  }, [workspaceCatalog, selectedNode?.entityRef]);

  const childExternalsCount = useMemo(() => {
    if (!selectedNode?.entityRef) return 0;
    return listChildDiagramExternals(workspaceCatalog, loadedSystems, selectedNode.entityRef)
      .length;
  }, [workspaceCatalog, loadedSystems, selectedNode?.entityRef]);

  const handleNameChangeLocal = (e: { target: { value: string } }) => {
    if (!isNode || !selectedNode) {
      updateSchemaName(e.target.value);
      return;
    }

    const rfNodeId = selectedRFNode?.id || selectedNodeId;
    if (!rfNodeId) return;
    updateNode(rfNodeId, planNodeNameUpdate(schema, selectedNode, rfNodeId, e.target.value));
  };

  const handleTypeOrLevelChange = (e: { target: { value: string } }) => {
    if (isNode) {
      if (!selectedNodeId) return;
      updateNode(selectedNodeId, { type: e.target.value as NodeType });
      return;
    }
    updateSchemaLevel(e.target.value as C4Level);
  };

  const handleAddProperty = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !selectedNode || !propKey.trim()) return;

    const nextProps: PropertyMap = {
      ...(selectedNode.properties || {}),
      [propKey.trim()]: propVal,
    };

    updateNode(selectedNodeId, { properties: nextProps });
    setPropKey('');
    setPropVal('');
  };

  const handleDeleteProperty = (key: string) => {
    if (!selectedNodeId || !selectedNode || !selectedNode.properties) return;
    const nextProps = { ...selectedNode.properties };
    delete nextProps[key];
    updateNode(selectedNodeId, { properties: nextProps });
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNode) return;
    if (!confirm(`Are you sure you want to delete this ${titleType.toLowerCase()}?`)) return;
    deleteNode(selectedNode.entityRef || '');
  };

  const handleExternalChange = (checked: boolean) => {
    updateNode(selectedNode?.entityRef || '', { external: checked });
  };

  const handleSafeguardChange = (key: keyof NodeSafeguards, enabled: boolean) => {
    if (!selectedNode?.entityRef) return;
    setResilienceSafeguard(selectedNode.entityRef, key, enabled);
  };

  return {
    schema,
    selectedNodeId,
    selectedEdgeId,
    validationResult,
    addNode,
    selectNode,
    selectEdge,
    updateDependency,
    deleteDependency,
    rightCollapsed,
    toggleRightCollapsed,
    loadedSystems,
    isResilienceMode,
    resilienceTelemetryView,
    resiliencePanelTab,
    setResilienceTelemetryView,
    setResiliencePanelTab,
    resilienceFaults,
    resilienceMonteCarlo,
    resilienceSimulationResult,
    chaosSpecMetadata,
    setResilienceFaultType,
    setResilienceSeverity,
    setResilienceMonteCarlo,
    addResilienceFaultFromDraft,
    removeResilienceFault,
    openChaosSpecDialog,
    openChaosSpecPicker,
    clearResilienceScenario,
    isSampleWorkspace,
    propKey,
    setPropKey,
    propVal,
    setPropVal,
    selectedNode,
    selectedEdge,
    edgeEndpointMissing,
    isNode,
    isEdge,
    showPropertiesPanel,
    showSimulationPanel,
    resilienceRecommendations,
    titleType,
    selectedResilienceSafeguards,
    nameValue,
    nameInputId,
    entityRefValue,
    entityRefInputId,
    selectId,
    nodeConnections,
    dependencyGraphModel,
    childDiagramEntry,
    childExternalsCount,
    editorFaultType,
    editorSeverity,
    handleNameChangeLocal,
    handleTypeOrLevelChange,
    handleAddProperty,
    handleDeleteProperty,
    handleDeleteSelectedNode,
    handleExternalChange,
    handleSafeguardChange,
  };
}

export type PropertyPanelModel = ReturnType<typeof usePropertyPanelModel>;
