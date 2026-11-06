import React from 'react';
import { Braces, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { WorkspacePanelSlot } from './workspacePanelLayout';

export interface WorkspacePanelRailProps {
  slot: WorkspacePanelSlot;
  collapsed: boolean;
  onToggle: () => void;
  panelWidthPx: string;
  expandTitle: string;
  collapseTitle: string;
}

export const WorkspacePanelRail: React.FC<WorkspacePanelRailProps> = ({
  slot,
  collapsed,
  onToggle,
  panelWidthPx,
  expandTitle,
  collapseTitle,
}) => {
  const isLeft = slot === 'left';
  const positionStyle = isLeft
    ? { left: collapsed ? '0px' : `calc(min(${panelWidthPx}, 100vw - 40px))` }
    : { right: collapsed ? '0px' : `calc(min(${panelWidthPx}, 100vw - 40px))` };

  const roundedClass = isLeft ? 'rounded-r-xl border-l-0' : 'rounded-l-xl border-r-0';
  const label = collapsed ? expandTitle : collapseTitle;
  const PanelIcon = isLeft ? Braces : SlidersHorizontal;
  const CollapseChevron = isLeft ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-accent/40 text-slate-400 hover:text-accent hover:bg-slate-850 p-2.5 ${roundedClass} shadow-2xl transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 cursor-pointer items-center justify-center`}
      style={positionStyle}
      aria-label={label}
      aria-expanded={!collapsed}
      title={label}
      data-testid={`${slot}-panel-rail`}
    >
      {collapsed ? (
        <PanelIcon className="w-4 h-4 text-accent" data-testid={`${slot}-panel-rail-icon`} />
      ) : (
        <CollapseChevron className="w-4 h-4" data-testid={`${slot}-panel-rail-chevron`} />
      )}
    </button>
  );
};
