import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { NodeType } from '@archlens/core';

export function useCanvasDropNode(
  addNode: (type: NodeType, position?: { x: number; y: number }) => void
) {
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  return { onDragOver, onDrop };
}
