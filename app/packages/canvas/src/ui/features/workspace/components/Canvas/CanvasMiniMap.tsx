import React, { useCallback } from 'react';
import { MiniMap } from '@xyflow/react';
import { getCanvasMiniMapNodeColor } from './canvasDisplayGraph';

type CanvasMiniMapProps = {
  showHotspotHeatmap: boolean;
  isResilienceMode: boolean;
};

export const CanvasMiniMap: React.FC<CanvasMiniMapProps> = ({
  showHotspotHeatmap,
  isResilienceMode,
}) => {
  const nodeColor = useCallback(
    (n: Parameters<typeof getCanvasMiniMapNodeColor>[0]) =>
      getCanvasMiniMapNodeColor(n, showHotspotHeatmap, isResilienceMode),
    [showHotspotHeatmap, isResilienceMode]
  );

  return (
    <div className="hidden md:block">
      <MiniMap
        position="bottom-left"
        bgColor="#0f172a"
        nodeColor={nodeColor}
        maskColor="rgba(15, 23, 42, 0.6)"
        className="border border-slate-800 rounded-lg overflow-hidden"
        style={{ width: 120, height: 90 }}
      />
    </div>
  );
};
