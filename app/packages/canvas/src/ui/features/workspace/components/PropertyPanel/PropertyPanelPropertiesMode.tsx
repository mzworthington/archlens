import React from 'react';
import { GoToEntityButton } from '../GoToEntityButton';
import { ExternalDependenciesSection } from './ExternalDependenciesSection';
import { IdentitySection } from './IdentitySection';
import { SelectedDependencySection } from './SelectedDependencySection';
import { SelectedNodeSections } from './SelectedNodeSections';
import type { PropertyPanelModel } from './usePropertyPanelModel';

export const PropertyPanelPropertiesMode: React.FC<{ model: PropertyPanelModel }> = ({ model }) => {
  const {
    isEdge,
    isNode,
    selectedNode,
    selectedEdge,
    edgeEndpointMissing,
    schema,
    selectedNodeId,
    loadedSystems,
    updateDependency,
    deleteDependency,
    selectNode,
  } = model;

  return (
    <>
      {!isEdge ? (
        <IdentitySection
          isNode={isNode}
          schema={schema}
          selectedNode={selectedNode ?? null}
          nameValue={model.nameValue}
          nameInputId={model.nameInputId}
          entityRefValue={model.entityRefValue}
          entityRefInputId={model.entityRefInputId}
          selectId={model.selectId}
          onNameChange={model.handleNameChangeLocal}
          onTypeOrLevelChange={model.handleTypeOrLevelChange}
          onExternalChange={model.handleExternalChange}
        />
      ) : null}

      {isNode && selectedNode?.external && selectedNode.entityRef ? (
        <div className="flex items-center justify-between rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/90">
            Canonical entity
          </span>
          <GoToEntityButton
            entityRef={selectedNode.entityRef}
            label="Go to"
            className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
          />
        </div>
      ) : null}

      {isEdge && selectedEdge ? (
        <SelectedDependencySection
          edge={selectedEdge}
          schemaNodes={schema.nodes}
          isDangling={edgeEndpointMissing}
          onUpdateDependency={updateDependency}
          onDeleteDependency={deleteDependency}
          onSelectNode={selectNode}
        />
      ) : isNode && selectedNode ? (
        <SelectedNodeSections
          selectedNode={selectedNode}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={model.selectedEdgeId}
          schema={schema}
          propKey={model.propKey}
          propVal={model.propVal}
          setPropKey={model.setPropKey}
          setPropVal={model.setPropVal}
          handleAddProperty={model.handleAddProperty}
          handleDeleteProperty={model.handleDeleteProperty}
          nodeConnections={model.nodeConnections}
          dependencyGraphModel={model.dependencyGraphModel}
          selectNode={selectNode}
          selectEdge={model.selectEdge}
          updateDependency={updateDependency}
          deleteDependency={deleteDependency}
          childDiagramEntry={model.childDiagramEntry}
          childExternalsCount={model.childExternalsCount}
          handleDeleteSelectedNode={model.handleDeleteSelectedNode}
          titleType={model.titleType}
        />
      ) : (
        <div className="flex flex-col gap-6 w-full min-w-0">
          {loadedSystems.length > 0 ? <ExternalDependenciesSection /> : null}
        </div>
      )}
    </>
  );
};
