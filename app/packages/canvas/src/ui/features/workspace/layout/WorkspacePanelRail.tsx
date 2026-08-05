import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkspacePanelSlot } from './workspacePanelLayout';

export interface WorkspacePanelRailProps {
  slot: WorkspacePanelSlot;
  collapsed: boolean;
  onToggle: () => void;
  panelWidthPx: string;
  expandTitle: string;
  collapseTitle: string;
  ariaLabel: string;
}

export const WorkspacePanelRail: React.FC<WorkspacePanelRailProps> = ({
  slot,
  collapsed,
  onToggle,
  panelWidthPx,
  expandTitle,
  collapseTitle,
  ariaLabel,
}) => {
  const isLeft = slot === 'left';
  const positionStyle = isLeft
    ? { left: collapsed ? '0px' : `calc(min(${panelWidthPx}, 100vw - 40px))` }
    : { right: collapsed ? '0px' : `calc(min(${panelWidthPx}, 100vw - 40px))` };

  const roundedClass = isLeft ? 'rounded-r-xl border-l-0' : 'rounded-l-xl border-r-0';

  return (
    <button
      onClick={onToggle}
      className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 ${roundedClass} shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer items-center justify-center`}
      style={positionStyle}
      aria-label={ariaLabel}
      title={collapsed ? expandTitle : collapseTitle}
      data-testid={`${slot}-panel-rail`}
    >
      {isLeft ? (
        collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )
      ) : collapsed ? (
        <ChevronLeft className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
    </button>
  );
};
