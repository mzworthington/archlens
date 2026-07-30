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

export const WorkspaceToolbar: React.FC = () => {
  return (
    <div
      className="flex flex-col gap-2 w-full min-w-0 max-w-full"
      onClick={e => e.stopPropagation()}
    >
      <MobilePanelToggles />

      <div className="flex items-center gap-2 w-full min-w-0 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Searchbar collapsibleOnMobile />
        </div>

        <LayoutEngineControls />

        <div className="h-6 w-px bg-slate-800 shrink-0 hidden sm:block" aria-hidden />

        <LensToolbarControls />

        <div className="h-6 w-px bg-slate-800 shrink-0 hidden sm:block" aria-hidden />

        <div className="flex items-center gap-1 shrink-0">
          <ToolbarDisplayButton />
          <ToolbarShortcutsButton />
          <ToolbarPendingChangesButton />
          <ToolbarEditActions />
          <ToolbarOverflowMenu />
        </div>
      </div>
    </div>
  );
};
