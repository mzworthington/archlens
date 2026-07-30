import React from 'react';
import { Searchbar } from '../Searchbar/Searchbar';
import { MobilePanelToggles } from '../MobilePanelToggles/MobilePanelToggles';
import {
  ToolbarEditActions,
  ToolbarOverflowMenu,
  ToolbarPendingChangesButton,
  ToolbarDisplayButton,
  ToolbarShortcutsButton,
} from '../ActionControls/ActionControls';
import { LayoutEngineControls } from '../LayoutEngineControls/LayoutEngineControls';
import { LensToolbarControls } from './LensToolbarControls';

const toolbarActions = (
  <>
    <ToolbarDisplayButton />
    <ToolbarShortcutsButton />
    <ToolbarPendingChangesButton />
    <ToolbarEditActions />
    <ToolbarOverflowMenu />
  </>
);

export const WorkspaceToolbar: React.FC = () => {
  return (
    <div
      className="flex flex-col gap-2 w-full min-w-0 max-w-full"
      onClick={e => e.stopPropagation()}
      data-testid="workspace-toolbar"
    >
      <MobilePanelToggles />

      {/* Row 1: search + primary actions — never competes with layout/lens controls */}
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="flex-1 min-w-0 max-w-md">
          <Searchbar collapsibleOnMobile fillWidth />
        </div>
        <div className="flex items-center gap-1 shrink-0">{toolbarActions}</div>
      </div>

      {/* Row 2: layout + lenses — horizontal scroll on narrow viewports */}
      <div className="flex items-center gap-2 w-full min-w-0 overflow-x-auto flex-nowrap [scrollbar-width:thin]">
        <LayoutEngineControls />
        <div className="h-6 w-px bg-slate-800 shrink-0" aria-hidden />
        <LensToolbarControls />
      </div>
    </div>
  );
};
