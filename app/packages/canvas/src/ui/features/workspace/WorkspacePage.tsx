import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { LeftWorkspacePanel } from './layout/LeftWorkspacePanel';
import { Canvas } from './components/Canvas/Canvas';
import { TraceLensPanel } from '../tracelens/TraceLensPanel';
import { PropertyPanel } from './components/PropertyPanel/PropertyPanel';
import { Header } from './components/Header/Header';
import { useWorkspaceDialogs } from './hooks/useWorkspaceDialogs';
import { useBundledWorkspaceBootstrap } from './hooks/useBundledWorkspaceBootstrap';
import { useUrlSync } from './hooks/useUrlSync';
import { useWorkspaceLensSync } from './hooks/useWorkspaceLensSync';
import { useCollabRoomSync } from './hooks/useCollabRoomSync';
import { CollabNameDialog } from './components/CollabNameDialog/CollabNameDialog';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useBlueprintStore } from '../../../application/store/store';
import { WorkspacePanelRail } from './layout/WorkspacePanelRail';
import { useWorkspacePanelLayout } from './layout/useWorkspacePanelLayout';
import { WORKSPACE_PANEL_WIDTH } from './layout/workspacePanelLayout';
export const WorkspacePage: React.FC = () => {
  const { setIsShortcutsOpen } = useBlueprintStore();
  const layout = useWorkspacePanelLayout();
  const workspaceDialogs = useWorkspaceDialogs();

  useBundledWorkspaceBootstrap();
  useUrlSync();
  useWorkspaceLensSync();
  const collabJoin = useCollabRoomSync();

  useKeyboardNavigation({
    onShortcutsOpen: () => setIsShortcutsOpen(true),
  });

  const showLeftPanel = layout.showLeftSlot;

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-dvh w-full bg-bp-canvas overflow-hidden text-slate-100 selection:bg-brand-600/30">
        <Header />
        <div className="flex-1 flex overflow-hidden relative min-h-0">
          {showLeftPanel ? <LeftWorkspacePanel /> : null}
          {layout.isTraceLensMode ? <TraceLensPanel /> : <Canvas />}
          {layout.showRightSlot ? <PropertyPanel /> : null}

          {!layout.isTraceLensMode ? (
            <>
              <WorkspacePanelRail
                slot="left"
                collapsed={layout.leftCollapsed}
                onToggle={layout.toggleLeftSlot}
                panelWidthPx={WORKSPACE_PANEL_WIDTH.left}
                expandTitle={layout.leftRailTitle.expand}
                collapseTitle={layout.leftRailTitle.collapse}
                ariaLabel="Toggle left panel"
              />
              <WorkspacePanelRail
                slot="right"
                collapsed={layout.rightCollapsed}
                onToggle={layout.toggleRightSlot}
                panelWidthPx={WORKSPACE_PANEL_WIDTH.right}
                expandTitle="Expand Properties Panel"
                collapseTitle="Collapse Properties Panel"
                ariaLabel="Toggle right panel"
              />
            </>
          ) : null}
        </div>
      </div>
      {workspaceDialogs}
      <CollabNameDialog
        isOpen={collabJoin.needsDisplayName}
        initialName={collabJoin.prefillName}
        onConfirm={collabJoin.confirmDisplayName}
        onCancel={collabJoin.cancelJoin}
      />
    </ReactFlowProvider>
  );
};
