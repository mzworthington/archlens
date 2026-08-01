import React from 'react';
import type { WorkspacePanelId, WorkspacePanelSlot } from './workspacePanelLayout';
import { WORKSPACE_PANEL_WIDTH_CLASS } from './workspacePanelLayout';

export interface WorkspacePanelShellProps {
  panelId: WorkspacePanelId;
  slot: WorkspacePanelSlot;
  title: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  closeAriaLabel?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
  /** Override default data-testid (`${panelId}-panel`). */
  testId?: string;
  bodyClassName?: string;
}

export const WorkspacePanelShell: React.FC<WorkspacePanelShellProps> = ({
  panelId,
  slot,
  title,
  collapsed,
  onToggleCollapse,
  closeAriaLabel,
  headerActions,
  children,
  footer,
  widthClass,
  testId,
  bodyClassName,
}) => {
  const borderClass = slot === 'left' ? 'border-r border-slate-900' : 'border-l border-slate-900';
  const collapsedBorderClass = slot === 'left' ? 'border-r-0' : 'border-l-0';

  return (
    <div
      data-testid={testId ?? `${panelId}-panel`}
      className={`h-full flex flex-col bg-slate-950/80 glass-panel transition-all duration-300 ease-in-out ${
        collapsed
          ? `w-0 ${collapsedBorderClass} opacity-0 overflow-hidden pointer-events-none`
          : `w-full ${widthClass ?? WORKSPACE_PANEL_WIDTH_CLASS[slot]} ${borderClass}`
      }`}
    >
      <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/40 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="font-bold text-[#00f0ff] tracking-wider text-xs uppercase truncate font-mono">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerActions}
          <button
            onClick={onToggleCollapse}
            className="sm:hidden min-h-11 min-w-11 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center justify-center text-sm"
            title="Close Panel"
            aria-label={closeAriaLabel ?? 'Close panel'}
          >
            ✕
          </button>
        </div>
      </div>

      <div className={bodyClassName ?? 'flex-1 overflow-y-auto'}>{children}</div>

      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
};
