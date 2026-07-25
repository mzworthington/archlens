import { useState, useEffect, useMemo, useRef } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  buildBreadcrumbSegments,
  entityRefParentPrefix,
  getSchemaEntityRef,
  NEXT_C4_LEVEL,
  type BreadcrumbSegmentData,
  type C4Level,
  type SystemSchema,
} from '@blueprint/core';

export type BreadcrumbSegment = BreadcrumbSegmentData & {
  sameLevelSystems?: Array<{ path: string; name: string; schema: SystemSchema }>;
};

export function useBreadcrumbs() {
  const { currentFilePath, schema, isWorkspaceOpen, workspaceName, selectedNodeId, loadedSystems } =
    useBlueprintStore();

  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLevel = (schema.level || 'container') as C4Level;
  const activeEntityRef = getSchemaEntityRef(schema, workspaceName);
  const contextSystem = loadedSystems.find(s => s.schema.level === 'context');
  const contextEntityRef = contextSystem
    ? getSchemaEntityRef(contextSystem.schema, workspaceName)
    : undefined;

  const { namesByEntityRef, pathsByEntityRef } = useMemo(() => {
    const names: Record<string, string> = {};
    const paths: Record<string, string> = {};
    for (const system of loadedSystems) {
      const ref = getSchemaEntityRef(system.schema, workspaceName);
      names[ref] = system.name;
      paths[ref] = system.path;
    }
    for (const node of contextSystem?.schema.nodes ?? []) {
      if (node.entityRef) names[node.entityRef] = node.name;
    }
    return { namesByEntityRef: names, pathsByEntityRef: paths };
  }, [loadedSystems, contextSystem, workspaceName]);

  const selectedNode = selectedNodeId
    ? schema.nodes.find(n => n.entityRef === selectedNodeId)
    : null;

  const segments = useMemo(() => {
    const childSystem = selectedNode?.entityRef
      ? loadedSystems.find(s => s.schema.entityRef === selectedNode.entityRef)
      : undefined;

    return buildBreadcrumbSegments({
      entityRef: activeEntityRef,
      currentName: schema.name,
      currentPath: currentFilePath,
      currentLevel: activeLevel,
      namesByEntityRef,
      pathsByEntityRef,
      zoomPreview:
        selectedNode?.entityRef && childSystem
          ? {
              name: selectedNode.name || selectedNode.entityRef,
              entityRef: selectedNode.entityRef,
              path: childSystem.path,
              level: childSystem.schema.level || NEXT_C4_LEVEL[activeLevel],
            }
          : undefined,
    });
  }, [
    activeEntityRef,
    activeLevel,
    schema.name,
    currentFilePath,
    namesByEntityRef,
    pathsByEntityRef,
    selectedNode,
    loadedSystems,
  ]);

  const currentChildren = useMemo(() => {
    const system = loadedSystems.find(s => s.path === currentFilePath);
    if (!system) return [];

    const nodeEntityRefs = new Set(
      system.schema.nodes.map(n => n.entityRef).filter((ref): ref is string => !!ref)
    );

    return loadedSystems
      .filter(s => s.schema.entityRef && nodeEntityRefs.has(s.schema.entityRef))
      .map(s => ({
        path: s.path,
        name: s.name,
        entityRef: getSchemaEntityRef(s.schema, workspaceName),
      }));
  }, [loadedSystems, currentFilePath, workspaceName]);

  const segmentsWithSiblings = useMemo(() => {
    return segments.map((seg, idx) => {
      const parentEntityRef = idx > 0 ? segments[idx - 1]?.entityRef : undefined;
      const segDepth = seg.entityRef.split('/').filter(Boolean).length;

      const sameLevelSystems = loadedSystems.filter(s => {
        const ref = getSchemaEntityRef(s.schema, workspaceName);
        if (s.schema.level !== seg.level || ref === seg.entityRef) return false;
        if (!parentEntityRef) return true;
        return (
          ref.split('/').filter(Boolean).length === segDepth &&
          entityRefParentPrefix(ref, contextEntityRef) === parentEntityRef
        );
      });

      return { ...seg, sameLevelSystems };
    });
  }, [segments, loadedSystems, workspaceName, contextEntityRef]);

  return {
    openDropdownIdx,
    setOpenDropdownIdx,
    dropdownRef,
    activeLevel,
    segments: segmentsWithSiblings,
    hasNextLevelChildren: currentChildren.length > 0,
    currentChildren,
    getNextLevel: (level: C4Level) => NEXT_C4_LEVEL[level],
    isWorkspaceOpen,
    workspaceName,
  };
}
