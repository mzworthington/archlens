import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CodeViewer } from './components/CodeViewer/CodeViewer';
import { Canvas } from './components/Canvas/Canvas';
import { TraceLensPanel } from './components/TraceLensPanel/TraceLensPanel';
import { PropertyPanel } from './components/PropertyPanel/PropertyPanel';
import { Header } from './components/Header/Header';
import { useBlueprintStore } from '../../../application/store/store';
import { useUrlSync } from './hooks/useUrlSync';
import { useBundledWorkspaceBootstrap } from './hooks/useBundledWorkspaceBootstrap';
import { useWorkspaceLensSync } from './hooks/useWorkspaceLensSync';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useWorkspaceDialogs } from './hooks/useWorkspaceDialogs';
import { LensToolbarControls } from './components/WorkspaceToolbar/LensToolbarControls';

export const WorkspacePage: React.FC = () => {
  const {
    leftCollapsed,
    rightCollapsed,
    toggleLeftCollapsed,
    toggleRightCollapsed,
    setIsShortcutsOpen,
    isTraceLensMode,
  } = useBlueprintStore();
  const workspaceDialogs = useWorkspaceDialogs();

  useBundledWorkspaceBootstrap();
  useUrlSync();
  useWorkspaceLensSync();

  useKeyboardNavigation({
    onShortcutsOpen: () => setIsShortcutsOpen(true),
  });

  useEffect(() => {
    if (!isTraceLensMode) return;
    useBlueprintStore.setState({ leftCollapsed: true, rightCollapsed: true });
  }, [isTraceLensMode]);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-dvh w-full bg-bp-canvas overflow-hidden text-slate-100 selection:bg-brand-600/30">
        <Header />
        <div className="flex-1 flex overflow-hidden relative min-h-0">
          {!leftCollapsed && !isTraceLensMode ? <CodeViewer /> : null}
          {isTraceLensMode ? <TraceLensPanel /> : <Canvas />}
          {!isTraceLensMode ? <PropertyPanel /> : null}

          {!isTraceLensMode ? (
            <>
              <button
                onClick={toggleLeftCollapsed}
                className="hidden sm:flex absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 rounded-r-xl shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer items-center justify-center border-l-0"
                style={{ left: leftCollapsed ? '0px' : 'calc(min(384px, 100vw - 40px))' }}
                aria-label="Toggle Left Panel"
                title={leftCollapsed ? 'Expand Schema Explorer' : 'Collapse Schema Explorer'}
              >
                {leftCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={toggleRightCollapsed}
                className="hidden sm:flex absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 rounded-l-xl shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer items-center justify-center border-r-0"
                style={{ right: rightCollapsed ? '0px' : 'calc(min(320px, 100vw - 40px))' }}
                aria-label="Toggle Right Panel"
                title={rightCollapsed ? 'Expand Properties Panel' : 'Collapse Properties Panel'}
              >
                {rightCollapsed ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </>
          ) : null}
        </div>
        {isTraceLensMode ? (
          <div className="shrink-0 border-t border-slate-850 bg-slate-950/90 px-3 py-2 flex justify-center">
            <LensToolbarControls />
          </div>
        ) : null}
      </div>
      {workspaceDialogs}
    </ReactFlowProvider>
  );
};
