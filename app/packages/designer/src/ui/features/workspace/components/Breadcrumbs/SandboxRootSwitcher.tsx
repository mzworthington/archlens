import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  getSandboxKindLabel,
  SANDBOX_ROOT_LABEL,
} from '../../../../../application/store/sandboxLabels';
import { WorkspaceStorageBadge } from './WorkspaceStorageBadge';
import { useSandboxRoot } from './useSandboxRoot';

type SandboxRootSwitcherProps = {
  variant?: 'inline' | 'menu-header';
};

export const SandboxRootSwitcher: React.FC<SandboxRootSwitcherProps> = ({ variant = 'inline' }) => {
  const { showSandboxRoot, activeLabel, siblingKinds, menuOpen, setMenuOpen, switching, switchTo } =
    useSandboxRoot();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, setMenuOpen]);

  if (!showSandboxRoot) return null;

  const menu = menuOpen ? (
    <div
      className={`absolute top-full mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl py-1.5 z-50 min-w-[220px] backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-150 text-[11px] ${
        variant === 'menu-header' ? 'left-0' : 'left-0'
      }`}
      data-testid="sandbox-root-menu"
    >
      <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900/60 mb-1">
        Switch sandbox
      </div>
      {siblingKinds.map(kind => (
        <button
          key={kind}
          type="button"
          disabled={switching}
          onClick={() => void switchTo(kind)}
          className="w-full text-left px-3 py-2 hover:bg-slate-900/80 hover:text-brand-400 text-slate-400 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          data-testid={`sandbox-switch-${kind}`}
        >
          <span className="truncate">{getSandboxKindLabel(kind)}</span>
        </button>
      ))}
    </div>
  ) : null;

  if (variant === 'menu-header') {
    return (
      <div className="px-3 py-1.5 border-b border-slate-900/60 mb-1">
        <div className="flex items-center gap-2 mb-1">
          <WorkspaceStorageBadge isWorkspaceOpen={false} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">
            {SANDBOX_ROOT_LABEL}
          </span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={switching}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 transition cursor-pointer disabled:opacity-50"
            data-testid="sandbox-root-trigger"
            aria-expanded={menuOpen}
          >
            <span>{activeLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          </button>
          {menu}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 text-slate-400 font-medium min-w-0">
        <WorkspaceStorageBadge isWorkspaceOpen={false} />
        <span className="shrink-0 text-slate-500">{SANDBOX_ROOT_LABEL}</span>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />

      <div className="relative flex items-center gap-0.5 min-w-0" ref={menuRef}>
        <span
          className="truncate max-w-[100px] sm:max-w-[150px] text-slate-300 font-semibold"
          data-testid="sandbox-kind-label"
          title={`${activeLabel} sandbox`}
        >
          {switching ? 'Loading…' : activeLabel}
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={switching}
          className={`p-0.5 rounded hover:bg-slate-900 transition focus:outline-none cursor-pointer shrink-0 disabled:opacity-50 ${
            menuOpen ? 'text-brand-400 bg-slate-900/50' : 'text-slate-600 hover:text-slate-300'
          }`}
          title="Switch sandbox"
          data-testid="sandbox-root-trigger"
          aria-expanded={menuOpen}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {menu}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />
    </>
  );
};
