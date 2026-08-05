import React from 'react';
import { Zap } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';

const btnClass =
  'relative px-2 py-1 rounded-md text-[10px] font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 min-w-[2rem]';

const LITE_CANVAS_HELP =
  'Faster pan and zoom on large diagrams: hide minimap/grid, simplify nodes, cap edge animation.';

export const LiteCanvasButton: React.FC = () => {
  const { liteCanvas, toggleLiteCanvas } = useBlueprintStore();

  return (
    <button
      type="button"
      onClick={toggleLiteCanvas}
      aria-pressed={liteCanvas}
      data-testid="toolbar-lite-canvas"
      title={liteCanvas ? 'Turn off lite canvas' : LITE_CANVAS_HELP}
      aria-label={liteCanvas ? 'Turn off lite canvas' : 'Turn on lite canvas'}
      className={`${btnClass} ${
        liteCanvas
          ? 'bg-brand-500/20 text-brand-300'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
      }`}
    >
      <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span className="hidden lg:inline">Lite</span>
    </button>
  );
};
