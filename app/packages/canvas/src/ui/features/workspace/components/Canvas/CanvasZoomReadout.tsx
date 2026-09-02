import React from 'react';
import { useStore } from '@xyflow/react';
import { formatZoomPercent } from '../../../../../application/canvas/diagramViewport';

/** Current canvas zoom, stacked above the built-in +/- / fit / lock controls. */
export const CanvasZoomReadout: React.FC = () => {
  const zoom = useStore(state => state.transform[2]);
  const label = formatZoomPercent(zoom);

  return (
    <div
      className="canvas-zoom-readout"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Canvas zoom ${label}`}
      data-testid="canvas-zoom-percent"
    >
      {label}
    </div>
  );
};
