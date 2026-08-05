import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Image, FileImage } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { exportCanvasImage } from '../../../../../application/canvas/exportCanvasImage';

type Props = {
  menuItemClass: string;
  onClose: () => void;
};

export const DiagramExportMenuItems: React.FC<Props> = ({ menuItemClass, onClose }) => {
  const nodes = useBlueprintStore(s => s.nodes);
  const schema = useBlueprintStore(s => s.schema);
  const setNotification = useBlueprintStore(s => s.setNotification);
  const controlsDisabled = Boolean(useBlueprintStore(s => s.isLoading));
  useReactFlow();

  const handleExport = useCallback(
    async (format: 'png' | 'svg') => {
      onClose();
      const viewport = document.querySelector('.react-flow__viewport');
      if (!(viewport instanceof HTMLElement)) {
        setNotification({
          type: 'error',
          title: 'Export failed',
          message: 'Canvas is not ready yet. Try again in a moment.',
        });
        return;
      }

      try {
        await exportCanvasImage(viewport, nodes, format, schema.name);
        setNotification({
          type: 'success',
          title: 'Diagram exported',
          message: `Saved ${schema.name} as ${format.toUpperCase()}.`,
        });
      } catch (error: unknown) {
        setNotification({
          type: 'error',
          title: 'Export failed',
          message: error instanceof Error ? error.message : 'Could not export diagram.',
        });
      }
    },
    [nodes, onClose, schema.name, setNotification]
  );

  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={() => void handleExport('png')}
        disabled={controlsDisabled || nodes.length === 0}
        className={menuItemClass}
        title="Export the visible diagram as PNG for slides and docs"
        data-testid="export-diagram-png"
      >
        <Image className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        Export PNG
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => void handleExport('svg')}
        disabled={controlsDisabled || nodes.length === 0}
        className={menuItemClass}
        title="Export the visible diagram as SVG"
        data-testid="export-diagram-svg"
      >
        <FileImage className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        Export SVG
      </button>
    </>
  );
};
