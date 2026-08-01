import React, { useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CodeViewer } from './components/CodeViewer/CodeViewer';
import { Canvas } from './components/Canvas/Canvas';
import { PropertyPanel } from './components/PropertyPanel/PropertyPanel';
import { Header } from './components/Header/Header';
import { useBlueprintStore } from '../../../application/store/store';
import { useUrlSync } from './hooks/useUrlSync';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useWorkspaceDialogs } from './hooks/useWorkspaceDialogs';

function isWorkspaceRoute(location: string): boolean {
  return location === '/workspace' || location.startsWith('/workspace/');
}

export const WorkspacePage: React.FC = () => {
  const [location] = useLocation();
  const {
    leftCollapsed,
    rightCollapsed,
    toggleLeftCollapsed,
    toggleRightCollapsed,
    setIsStartupOpen,
    setIsShortcutsOpen,
  } = useBlueprintStore();
  const workspaceDialogs = useWorkspaceDialogs();

  useUrlSync();

  const previousLocationRef = useRef<string | null>(null);

  // Open the chooser whenever navigation enters the workspace route.
  useEffect(() => {
    const previous = previousLocationRef.current;
    previousLocationRef.current = location;

    const onWorkspace = isWorkspaceRoute(location);
    const wasOnWorkspace = previous != null && isWorkspaceRoute(previous);

    if (onWorkspace && !wasOnWorkspace) {
      setIsStartupOpen(true);
    }
  }, [location, setIsStartupOpen]);

  useKeyboardNavigation({
    onShortcutsOpen: () => setIsShortcutsOpen(true),
  });

  // Docs deep link: /workspace/...?resilience=1 enters ChaosLens mode.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('resilience') !== '1') return;
    useBlueprintStore.getState().setResilienceMode(true);
    params.delete('resilience');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-dvh w-full bg-bp-canvas overflow-hidden text-slate-100 selection:bg-brand-600/30">
        <Header />
        <div className="flex-1 flex overflow-hidden relative">
          {!leftCollapsed ? <CodeViewer /> : null}
          <Canvas />
          <PropertyPanel />

          {/* Desktop: thin edge rails. Mobile panel chips live in WorkspaceToolbar. */}
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
        </div>
      </div>
      {workspaceDialogs}
    </ReactFlowProvider>
  );
};
