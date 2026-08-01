import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  SANDBOX_DEFINITIONS,
  getSandboxDefinition,
  type SandboxContextPath,
} from '../../../../../application/store/defaultData';
import { useBlueprintStore } from '../../../../../application/store/store';
import { buildWorkspaceEntityHref } from '../../../../../application/store/sandboxWorkspace';

type SandboxSwitcherProps = {
  activeContextPath: SandboxContextPath | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

/** Breadcrumb control for switching between bundled sandbox trees. */
export const SandboxSwitcher: React.FC<SandboxSwitcherProps> = ({
  activeContextPath,
  open,
  onToggle,
  onClose,
}) => {
  const [, setLocation] = useLocation();
  const loadBundledSandbox = useBlueprintStore(state => state.loadBundledSandbox);
  const selectSystem = useBlueprintStore(state => state.selectSystem);
  const activeDefinition = activeContextPath ? getSandboxDefinition(activeContextPath) : undefined;
  const activeName = activeDefinition?.name ?? 'Sandbox';

  const handleSelect = (contextPath: SandboxContextPath) => {
    if (contextPath === activeContextPath) {
      onClose();
      return;
    }

    const definition = getSandboxDefinition(contextPath);
    if (!definition) return;

    onClose();
    void (async () => {
      await loadBundledSandbox(contextPath);
      await selectSystem(contextPath);
      setLocation(buildWorkspaceEntityHref(definition.entityRef), { replace: true });
    })();
  };

  return (
    <div className="relative flex items-center gap-1.5 text-slate-400 font-medium min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:text-slate-200 hover:bg-slate-900/60 cursor-pointer focus:outline-none ${
          open ? 'text-brand-400 bg-slate-900/50' : ''
        }`}
        aria-expanded={open}
        title="Switch sandbox"
      >
        <span className="truncate">Sandboxes</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>
      <span className="text-slate-700 shrink-0">›</span>
      <span className="truncate text-slate-300" title={activeName}>
        {activeName}
      </span>

      {open ? (
        <div className="absolute top-full left-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl py-1.5 z-50 min-w-[220px] max-h-[280px] overflow-y-auto backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-150 text-[11px]">
          <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900/60 mb-1">
            Demo sandboxes
          </div>
          {SANDBOX_DEFINITIONS.map(definition => (
            <button
              key={definition.contextPath}
              type="button"
              onClick={() => handleSelect(definition.contextPath)}
              className={`w-full text-left px-3 py-2 transition flex items-center gap-2 ${
                definition.contextPath === activeContextPath
                  ? 'text-brand-400 bg-slate-900/60'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-brand-400'
              }`}
            >
              <span className="truncate">{definition.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
