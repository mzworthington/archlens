import { useState, useEffect, useMemo, useRef } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  buildBreadcrumbSegments,
  buildCatalogAncestorChain,
  getSchemaEntityRef,
  NEXT_C4_LEVEL,
  type BreadcrumbSegmentData,
  type C4Level,
  type SystemSchema,
  type WorkspaceCatalogEntry,
} from '@archlens/core';
import { useActiveDiagramEntity } from '../../hooks/useActiveDiagramEntity';

export type BreadcrumbSegment = BreadcrumbSegmentData & {
  sameLevelSystems?: Array<{ path: string; name: string; schema: SystemSchema }>;
};

export function useBreadcrumbs() {
  const {
    currentFilePath,
    schema,
    isWorkspaceOpen,
    isSampleWorkspace,
    workspaceName,
    selectedNodeId,
    loadedSystems,
    workspaceCatalog,
  } = useBlueprintStore();

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

  const contextSystems = loadedSystems.filter(s => s.schema.level === 'context');
  const activeLevel = (schema.level || 'container') as C4Level;
  const { activeEntityRef } = useActiveDiagramEntity();

  const { namesByEntityRef, pathsByEntityRef } = useMemo(() => {
    const names: Record<string, string> = {};
    const paths: Record<string, string> = {};
    for (const system of loadedSystems) {
      const ref = getSchemaEntityRef(system.schema, workspaceName);
      names[ref] = system.name;
      paths[ref] = system.path;
    }
    for (const contextSystem of contextSystems) {
      for (const node of contextSystem.schema.nodes ?? []) {
        if (node.entityRef) names[node.entityRef] = node.name;
      }
    }
    return { namesByEntityRef: names, pathsByEntityRef: paths };
  }, [loadedSystems, contextSystems, workspaceName]);

  const selectedNode = selectedNodeId
    ? schema.nodes.find(n => n.entityRef === selectedNodeId)
    : null;

  const segments = useMemo(() => {
    const childSystem = selectedNode?.entityRef
      ? loadedSystems.find(s => s.schema.entityRef === selectedNode.entityRef)
      : undefined;

    const zoomPreview =
      selectedNode?.entityRef && childSystem
        ? {
            name: selectedNode.name || selectedNode.entityRef,
            entityRef: selectedNode.entityRef,
            path: childSystem.path,
            level: childSystem.schema.level || NEXT_C4_LEVEL[activeLevel],
          }
        : undefined;

    const chain = buildCatalogAncestorChain(workspaceCatalog, activeEntityRef);
    let baseSegments: BreadcrumbSegmentData[];

    const owningContextSystem = chain.some(entry => entry.level === 'context')
      ? undefined
      : contextSystems.find(ctx =>
          ctx.schema.nodes?.some(
            node =>
              node.entityRef &&
              (activeEntityRef === node.entityRef ||
                activeEntityRef.startsWith(`${node.entityRef}/`))
          )
        );

    if (chain.length > 0) {
      const ancestors = chain.slice(0, -1);
      const contextAncestor =
        owningContextSystem && !ancestors.some(entry => entry.level === 'context')
          ? {
              entityRef: getSchemaEntityRef(owningContextSystem.schema, workspaceName),
              level: 'context' as const,
              name: owningContextSystem.name,
              path: owningContextSystem.path,
              isZoomPreview: false as const,
            }
          : undefined;

      const ancestorRefs = new Set(ancestors.map(entry => entry.entityRef));
      const nodeAncestors =
        owningContextSystem && activeEntityRef.includes('/')
          ? (owningContextSystem.schema.nodes
              ?.filter(
                node =>
                  node.entityRef &&
                  node.entityRef !== activeEntityRef &&
                  activeEntityRef.startsWith(`${node.entityRef}/`) &&
                  !ancestorRefs.has(node.entityRef)
              )
              .map(node => ({
                entityRef: node.entityRef!,
                level: 'container' as const,
                name: node.name,
                path: '',
                isZoomPreview: false as const,
              })) ?? [])
          : [];

      baseSegments = [
        ...(contextAncestor ? [contextAncestor] : []),
        ...ancestors.map(entry => ({
          entityRef: entry.entityRef,
          level: entry.level,
          name: namesByEntityRef[entry.entityRef] ?? entry.name,
          path: pathsByEntityRef[entry.entityRef] ?? entry.path,
          isZoomPreview: false as const,
        })),
        ...nodeAncestors,
        {
          entityRef: activeEntityRef,
          level: activeLevel,
          name: schema.name,
          path: currentFilePath,
          isZoomPreview: false as const,
        },
      ];
    } else {
      baseSegments = buildBreadcrumbSegments({
        entityRef: activeEntityRef,
        currentName: schema.name,
        currentPath: currentFilePath,
        currentLevel: activeLevel,
        namesByEntityRef,
        pathsByEntityRef,
      });
    }

    if (zoomPreview) {
      baseSegments = [...baseSegments, { ...zoomPreview, isZoomPreview: true }];
    }

    return baseSegments;
  }, [
    activeEntityRef,
    activeLevel,
    schema.name,
    currentFilePath,
    namesByEntityRef,
    pathsByEntityRef,
    selectedNode,
    loadedSystems,
    workspaceCatalog,
    contextSystems,
    workspaceName,
  ]);

  const currentChildren = useMemo(() => {
    const system = loadedSystems.find(s => s.path === currentFilePath);
    if (!system) return [];

    const nodeEntityRefs = new Set(
      system.schema.nodes.map(n => n.entityRef).filter((ref): ref is string => !!ref)
    );

    const fromLoaded = loadedSystems
      .filter(s => s.schema.entityRef && nodeEntityRefs.has(s.schema.entityRef))
      .map(s => ({
        path: s.path,
        name: s.name,
        entityRef: getSchemaEntityRef(s.schema, workspaceName),
      }));

    const loadedPaths = new Set(fromLoaded.map(c => c.path));
    const fromCatalog = workspaceCatalog
      .filter(
        entry =>
          entry.entityRef && nodeEntityRefs.has(entry.entityRef) && !loadedPaths.has(entry.path)
      )
      .map(entry => ({
        path: entry.path,
        name: entry.name,
        entityRef: entry.entityRef,
      }));

    return [...fromLoaded, ...fromCatalog];
  }, [loadedSystems, currentFilePath, workspaceName, workspaceCatalog]);

  const segmentsWithSiblings = useMemo(() => {
    const catalogStubSchema = (
      entry: WorkspaceCatalogEntry
    ): { path: string; name: string; schema: SystemSchema } => ({
      path: entry.path,
      name: entry.name,
      schema: {
        name: entry.name,
        version: 'https://archlens.dev/schemas/v4/blueprint.schema.json',
        level: entry.level,
        entityRef: entry.entityRef,
        nodes: [],
        dependencies: [],
      },
    });

    return segments.map((seg, idx) => {
      const parentEntityRef = idx > 0 ? segments[idx - 1]?.entityRef : undefined;

      const isPeerDiagram = (level: C4Level, entityRef: string): boolean => {
        if (level !== seg.level || entityRef === seg.entityRef) return false;
        const entry = workspaceCatalog.find(item => item.entityRef === entityRef);
        if (!parentEntityRef) {
          return seg.level === 'context' && level === 'context' && !entry?.parentEntityRef;
        }
        return entry?.parentEntityRef === parentEntityRef;
      };

      const fromLoaded = loadedSystems.filter(s => {
        const ref = getSchemaEntityRef(s.schema, workspaceName);
        return isPeerDiagram(s.schema.level as C4Level, ref);
      });

      const loadedRefs = new Set(fromLoaded.map(s => getSchemaEntityRef(s.schema, workspaceName)));

      const fromCatalog = workspaceCatalog
        .filter(entry => isPeerDiagram(entry.level, entry.entityRef))
        .filter(entry => !loadedRefs.has(entry.entityRef))
        .map(catalogStubSchema);

      return { ...seg, sameLevelSystems: [...fromLoaded, ...fromCatalog] };
    });
  }, [segments, loadedSystems, workspaceName, workspaceCatalog]);

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
    isSampleWorkspace,
    workspaceName,
  };
}
