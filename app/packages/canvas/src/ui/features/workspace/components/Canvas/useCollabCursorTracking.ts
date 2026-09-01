import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useBlueprintStore } from '../../../../../application/store/store';

/** Publish the local pointer in flow coordinates while a collab session is active. */
export function useCollabCursorTracking(): {
  onPointerMove: (event: { clientX: number; clientY: number }) => void;
  onPointerLeave: () => void;
} {
  const isActive = useBlueprintStore(s => s.collabSessionPort.isActive());
  const setCollabCursor = useBlueprintStore(s => s.setCollabCursor);
  const { screenToFlowPosition } = useReactFlow();
  const frameRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (isActive) setCollabCursor(null);
    };
  }, [isActive, setCollabCursor]);

  const onPointerMove = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (!isActive) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        setCollabCursor(position);
      });
    },
    [isActive, screenToFlowPosition, setCollabCursor]
  );

  const onPointerLeave = useCallback(() => {
    if (!isActive) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    setCollabCursor(null);
  }, [isActive, setCollabCursor]);

  return { onPointerMove, onPointerLeave };
}
