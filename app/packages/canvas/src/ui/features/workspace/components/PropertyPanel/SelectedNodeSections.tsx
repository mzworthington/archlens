import React from 'react';
import { Trash2 } from 'lucide-react';
import { ViewChildExternalsButton } from '../ViewChildExternalsButton';
import { ConnectionsSection } from './ConnectionsSection';
import { PropertiesSection } from './PropertiesSection';
import { SourceCodeSection } from './SourceCodeSection';
import type { PropertyPanelModel } from './usePropertyPanelModel';

type SelectedNodeSectionsProps = Pick<
  PropertyPanelModel,
  | 'selectedNode'
  | 'selectedNodeId'
  | 'selectedEdgeId'
  | 'schema'
  | 'propKey'
  | 'propVal'
  | 'setPropKey'
  | 'setPropVal'
  | 'handleAddProperty'
  | 'handleDeleteProperty'
  | 'nodeConnections'
  | 'dependencyGraphModel'
  | 'selectNode'
  | 'selectEdge'
  | 'updateDependency'
  | 'deleteDependency'
  | 'childDiagramEntry'
  | 'childExternalsCount'
  | 'handleDeleteSelectedNode'
  | 'titleType'
>;

export const SelectedNodeSections: React.FC<SelectedNodeSectionsProps> = ({
  selectedNode,
  selectedNodeId,
  selectedEdgeId,
  schema,
  propKey,
  propVal,
  setPropKey,
  setPropVal,
  handleAddProperty,
  handleDeleteProperty,
  nodeConnections,
  dependencyGraphModel,
  selectNode,
  selectEdge,
  updateDependency,
  deleteDependency,
  childDiagramEntry,
  childExternalsCount,
  handleDeleteSelectedNode,
  titleType,
}) => {
  if (!selectedNode || !selectedNodeId) return null;

  const filepath =
    typeof selectedNode.properties?.filepath === 'string'
      ? selectedNode.properties.filepath
      : undefined;

  return (
    <>
      <SourceCodeSection filepath={filepath} source={schema.source} />

      <PropertiesSection
        properties={selectedNode.properties}
        propKey={propKey}
        propVal={propVal}
        onPropKeyChange={setPropKey}
        onPropValChange={setPropVal}
        onAddProperty={handleAddProperty}
        onDeleteProperty={handleDeleteProperty}
      />

      <ConnectionsSection
        selectedNodeId={selectedNodeId}
        schemaNodes={schema.nodes}
        connections={nodeConnections}
        upstreamTotal={dependencyGraphModel.upstreamTotal}
        downstreamTotal={dependencyGraphModel.downstreamTotal}
        selectedConnectionId={selectedEdgeId}
        onSelectNode={selectNode}
        onSpotlightConnection={selectEdge}
        onUpdateDependency={updateDependency}
        onDeleteDependency={deleteDependency}
      />

      {childDiagramEntry && selectedNode.entityRef && childExternalsCount > 0 ? (
        <div className="border-t border-slate-900 pt-4" data-testid="child-level-externals-section">
          <ViewChildExternalsButton
            parentEntityRef={selectedNode.entityRef}
            externalsCount={childExternalsCount}
            testId="open-child-externals-dialog"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200 border border-cyan-900/40 hover:border-cyan-700/60 bg-cyan-950/20 hover:bg-cyan-950/40 rounded-lg transition cursor-pointer"
          />
        </div>
      ) : null}

      <div className="border-t border-slate-900 pt-4">
        <button
          onClick={handleDeleteSelectedNode}
          className="w-full flex items-center justify-center gap-2 bg-red-950/15 border border-red-900/30 hover:border-red-900/60 hover:bg-red-950/30 text-red-400 rounded-lg py-2 text-xs font-semibold transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Delete {titleType}
        </button>
      </div>
    </>
  );
};
