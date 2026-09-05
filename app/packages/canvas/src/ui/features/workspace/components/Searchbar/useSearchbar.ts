import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { navigateToWorkspaceEntity } from '../../../../../application/navigation/navigateToWorkspaceEntity';
import {
  searchWorkspaceNodes,
  type WorkspaceSearchHit,
} from '../../../../../application/search/searchWorkspaceNodes';

export interface UseSearchbarReturn {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  resultsMenuRef: React.RefObject<HTMLDivElement | null>;
  filteredNodes: WorkspaceSearchHit[];
  kbdText: string;
  handleSelectNode: (entityRef: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function centerOnNode(
  reactFlowInstance: ReturnType<typeof useReactFlow>,
  entityRef: string,
  attempt = 0
): void {
  try {
    const rfNode = reactFlowInstance.getNode(entityRef);
    if (rfNode?.position) {
      const x = rfNode.position.x + (rfNode.measured?.width ?? 280) / 2;
      const y = rfNode.position.y + (rfNode.measured?.height ?? 100) / 2;
      reactFlowInstance.setCenter(x, y, { zoom: 1.15, duration: 800 });
      return;
    }

    if (attempt < 24) {
      window.setTimeout(() => centerOnNode(reactFlowInstance, entityRef, attempt + 1), 50);
      return;
    }

    void reactFlowInstance.fitView({
      nodes: [{ id: entityRef }],
      duration: 800,
      padding: 0.25,
      maxZoom: 1.15,
    });
  } catch {
    // ReactFlow instance might not be fully initialized in test environment
  }
}

export function useSearchbar(): UseSearchbarReturn {
  const {
    loadedSystems,
    currentFilePath,
    showTests,
    showUpstreamExternals,
    showDownstreamExternals,
    workspaceCatalog,
  } = useBlueprintStore();
  const reactFlowInstance = useReactFlow();
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsMenuRef = useRef<HTMLDivElement>(null);

  // Close on outside click (include portaled results menu)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || resultsMenuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useKeyboardNavigation({
    onSearchOpen: () => {
      setTimeout(() => inputRef.current?.focus(), 50);
      setIsOpen(true);
    },
  });

  const filteredNodes = useMemo(
    () =>
      searchWorkspaceNodes(loadedSystems, currentFilePath, searchQuery, {
        showTests,
        showUpstreamExternals,
        showDownstreamExternals,
      }),
    [
      loadedSystems,
      currentFilePath,
      searchQuery,
      showTests,
      showUpstreamExternals,
      showDownstreamExternals,
    ]
  );

  // Reset highlighted index whenever the query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  const handleSelectNode = useCallback(
    (entityRef: string) => {
      const navigated = navigateToWorkspaceEntity(entityRef, {
        workspaceCatalog,
        setLocation,
      });
      setSearchQuery('');
      setIsOpen(false);

      if (!navigated) return;
      window.setTimeout(() => centerOnNode(reactFlowInstance, entityRef), 0);
    },
    [reactFlowInstance, setLocation, workspaceCatalog]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(1, filteredNodes.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredNodes.length) % Math.max(1, filteredNodes.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = filteredNodes[activeIndex];
      if (hit?.node.entityRef) {
        handleSelectNode(hit.node.entityRef);
      }
    }
  };

  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const kbdText = isMac ? '⌘K' : 'Ctrl+K';

  return {
    searchQuery,
    setSearchQuery,
    isOpen,
    setIsOpen,
    activeIndex,
    containerRef,
    inputRef,
    resultsMenuRef,
    filteredNodes,
    kbdText,
    handleSelectNode,
    handleKeyDown,
  };
}
