import React from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';

/** Diagram list for a live workspace room. Hidden when the room has a single file. */
export const CollabDiagramSwitcher: React.FC = () => {
  const active = useBlueprintStore(state => state.collabRoomActive);
  const systems = useBlueprintStore(state => state.loadedSystems);
  const currentPath = useBlueprintStore(state => state.currentFilePath);
  const selectSystem = useBlueprintStore(state => state.selectSystem);

  if (!active || systems.length < 2) return null;

  return (
    <nav
      aria-label="Diagrams in this room"
      data-testid="collab-diagram-switcher"
      className="flex items-center gap-1 shrink-0"
    >
      {systems.map(system => {
        const selected = system.path === currentPath;
        return (
          <button
            key={system.path}
            type="button"
            aria-current={selected ? 'page' : undefined}
            onClick={() => {
              void selectSystem(system.path);
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              selected
                ? 'bg-sky-500/15 text-sky-200 border-sky-800'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-slate-100'
            }`}
          >
            {system.name || system.path}
          </button>
        );
      })}
    </nav>
  );
};
