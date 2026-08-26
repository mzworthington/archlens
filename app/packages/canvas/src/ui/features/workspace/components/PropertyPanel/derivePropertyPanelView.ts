import type { SystemNode, SystemSchema } from '@archlens/core';
import { getSchemaEntityRef } from '@archlens/core';
import { mergeNodeSafeguards, resolveNodeResilience } from '@archlens/core/resilience';
import type { NodeSafeguards } from '@archlens/core/resilience';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';
import { resolvePropertyPanelTitle } from './propertyPanelTitle';
import {
  findSelectedEdge,
  isEdgeEndpointMissing,
  resolveSelectedRfNode,
  resolveSelectedSchemaNode,
} from './resolveSelectedNode';

export function derivePropertyPanelView({
  schema,
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  workspaceName,
  isResilienceMode,
  resiliencePanelTab,
  resilienceSafeguards,
}: {
  schema: SystemSchema;
  nodes: readonly BlueprintRFNode[];
  edges: readonly BlueprintRFEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  workspaceName: string | undefined;
  isResilienceMode: boolean;
  resiliencePanelTab: 'simulation' | 'properties';
  resilienceSafeguards: Partial<Record<string, NodeSafeguards>>;
}) {
  const selectedRFNode = resolveSelectedRfNode(nodes, selectedNodeId);
  const selectedNode = resolveSelectedSchemaNode(schema, selectedRFNode, selectedNodeId);
  const selectedEdge = findSelectedEdge(edges, selectedEdgeId);
  const edgeEndpointMissing = isEdgeEndpointMissing(nodes, selectedEdge);

  const isNode = !!selectedNode;
  const isEdge = !!selectedEdge;
  const showPropertiesPanel = !isResilienceMode || resiliencePanelTab === 'properties';
  const showSimulationPanel = isResilienceMode && resiliencePanelTab === 'simulation';

  const titleType = resolvePropertyPanelTitle({
    isResilienceMode,
    isEdge,
    isNode,
    nodeType: selectedNode?.type,
    schemaLevel: schema.level,
  });

  const selectedResilienceSafeguards =
    isNode && selectedNode?.entityRef
      ? mergeNodeSafeguards(
          resolveNodeResilience(selectedNode),
          resilienceSafeguards[selectedNode.entityRef]
        )
      : {};

  return {
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
    nameValue: isNode ? (selectedNode as SystemNode).name : schema.name,
    nameInputId: isNode ? 'component-name-input' : 'workspace-name-input',
    entityRefValue: isNode
      ? (selectedNode as SystemNode).entityRef || 'Not resolved'
      : getSchemaEntityRef(schema, workspaceName) || '',
    entityRefInputId: isNode ? 'component-entityref-input' : 'workspace-slug-input',
    selectId: isNode ? 'component-type-select' : 'workspace-level-select',
  };
}
