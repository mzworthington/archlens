import React from 'react';
import { ChevronDown, ChevronRight, Code, Compass, Folder, Layers, Network } from 'lucide-react';
import { Link } from 'wouter';
import { getSchemaEntityRef, type C4Level, type SystemSchema } from '@archlens/core';
import { BlankCanvasFileSave } from './BlankCanvasFileSave';
import { useBlueprintStore } from '../../../../../application/store/store';

const LEVEL_CONFIGS: Record<
  C4Level,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  context: {
    label: 'Context',
    bg: 'bg-emerald-950/45',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    icon: Compass,
  },
  container: {
    label: 'Container',
    bg: 'bg-blue-950/45',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    icon: Layers,
  },
  component: {
    label: 'Component',
    bg: 'bg-purple-950/45',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    icon: Network,
  },
  code: {
    label: 'Code',
    bg: 'bg-amber-950/45',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    icon: Code,
  },
};

export type BreadcrumbSegmentView = {
  name: string;
  path: string;
  level: C4Level;
  entityRef: string;
  isZoomPreview: boolean;
  sameLevelSystems?: { path: string; name: string; schema: SystemSchema }[];
};

export type BreadcrumbChildItem = {
  path: string;
  name: string;
  entityRef: string;
};

function resolveSegmentLinkClass(
  compact: boolean,
  isZoomPreview: boolean,
  isLast: boolean
): string {
  if (compact) {
    const stateClass = isZoomPreview
      ? 'border border-brand-500/20 bg-brand-950/20 text-brand-300'
      : isLast
        ? 'font-semibold text-slate-100'
        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-100';
    return `flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${stateClass}`;
  }
  const stateClass = isZoomPreview
    ? 'text-brand-400 hover:text-brand-300 font-medium cursor-pointer border border-brand-500/20 px-2 py-0.5 rounded bg-brand-950/20 hover:bg-brand-950/45'
    : 'text-slate-500 hover:text-slate-200 cursor-pointer';
  return `flex items-center gap-1.5 transition text-left focus:outline-none shrink-0 ${stateClass}`;
}

export function BreadcrumbSegmentTrail({
  segments,
  compact = false,
  isWorkspaceOpen,
  workspaceName,
  openDropdownIdx,
  setOpenDropdownIdx,
  workspaceLink,
  onNavigate,
  onSavedNavigate,
}: {
  segments: BreadcrumbSegmentView[];
  compact?: boolean;
  isWorkspaceOpen: boolean;
  workspaceName?: string;
  openDropdownIdx: number | null;
  setOpenDropdownIdx: (idx: number | null) => void;
  workspaceLink: (entityRef: string) => string;
  onNavigate?: () => void;
  onSavedNavigate: (entityRef: string) => void;
}) {
  return (
    <>
      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1;
        const isClickable = !isLast || seg.isZoomPreview;
        const segConfig = LEVEL_CONFIGS[seg.level];
        const SegIcon = segConfig.icon;
        const sameLevelSystems = seg.sameLevelSystems ?? [];
        const isDropdownOpen = openDropdownIdx === idx;

        return (
          <div key={`${seg.path}-${idx}`} className={compact ? 'py-0.5' : undefined}>
            <div className={`flex items-center ${compact ? 'gap-1' : 'gap-0.5'}`}>
              {compact && idx > 0 ? (
                <ChevronRight className="w-3 h-3 text-slate-700 shrink-0 ml-1" aria-hidden />
              ) : null}
              {!compact && idx > 0 ? (
                <ChevronRight className="w-3.5 h-3.5 text-slate-800 shrink-0" />
              ) : null}

              <div className={`relative flex items-center ${compact ? '' : 'gap-0.5'}`}>
                {isClickable ? (
                  <>
                    <Link
                      to={workspaceLink(seg.entityRef)}
                      onClick={onNavigate}
                      title="Click to zoom inside"
                      className={resolveSegmentLinkClass(compact, seg.isZoomPreview, isLast)}
                    >
                      <SegIcon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          compact || (isLast && !seg.isZoomPreview)
                            ? segConfig.text
                            : 'text-slate-600'
                        }`}
                      />
                      <span
                        className={compact ? 'truncate' : 'truncate max-w-[80px] sm:max-w-[150px]'}
                      >
                        {seg.name}
                      </span>
                    </Link>

                    {!compact && sameLevelSystems.length > 0 ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setOpenDropdownIdx(isDropdownOpen ? null : idx);
                        }}
                        className={`p-0.5 rounded hover:bg-slate-900 transition focus:outline-none cursor-pointer shrink-0 ${
                          isDropdownOpen
                            ? 'text-brand-400 bg-slate-900/50'
                            : 'text-slate-600 hover:text-slate-300'
                        }`}
                        title={`Other ${segConfig.label} systems`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </>
                ) : sameLevelSystems.length > 0 && !compact ? (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setOpenDropdownIdx(isDropdownOpen ? null : idx);
                    }}
                    className={`flex items-center gap-1 hover:text-slate-200 transition text-left focus:outline-none shrink-0 font-semibold cursor-pointer ${
                      isDropdownOpen ? 'text-brand-400' : 'text-slate-100'
                    }`}
                    title={`Other ${segConfig.label} systems`}
                  >
                    <SegIcon className={`w-3.5 h-3.5 shrink-0 ${segConfig.text}`} />
                    <span className="truncate max-w-[80px] sm:max-w-[150px]">{seg.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  </button>
                ) : isLast && !isWorkspaceOpen ? (
                  <BlankCanvasFileSave
                    compact={compact}
                    onSaved={() => {
                      onNavigate?.();
                      const { schema: nextSchema, workspaceName: nextWorkspace } =
                        useBlueprintStore.getState();
                      onSavedNavigate(getSchemaEntityRef(nextSchema, nextWorkspace || undefined));
                    }}
                  />
                ) : (
                  <div
                    className={
                      compact
                        ? 'flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-100'
                        : 'flex items-center gap-1.5 text-slate-100 font-semibold cursor-default shrink-0'
                    }
                  >
                    <SegIcon className={`w-3.5 h-3.5 shrink-0 ${segConfig.text}`} />
                    <span
                      className={compact ? 'truncate' : 'truncate max-w-[80px] sm:max-w-[150px]'}
                    >
                      {seg.name}
                    </span>
                  </div>
                )}

                {!compact && isDropdownOpen && sameLevelSystems.length > 0 ? (
                  <div className="absolute top-full left-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl py-1.5 z-50 min-w-[200px] max-h-[250px] overflow-y-auto backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-150 text-[11px]">
                    <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900/60 mb-1">
                      Other {segConfig.label} Levels
                    </div>
                    {sameLevelSystems.map(sys => {
                      const sysEntityRef = getSchemaEntityRef(sys.schema, workspaceName);
                      return (
                        <Link
                          key={sys.path}
                          to={workspaceLink(sysEntityRef)}
                          onClick={() => setOpenDropdownIdx(null)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-900/80 hover:text-brand-400 text-slate-400 transition flex items-center gap-2"
                        >
                          <SegIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span className="truncate">{sys.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {compact && sameLevelSystems.length > 0 ? (
              <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-800 pl-2">
                <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                  Other {segConfig.label}
                </p>
                {sameLevelSystems.map(sys => {
                  const sysEntityRef = getSchemaEntityRef(sys.schema, workspaceName);
                  return (
                    <Link
                      key={sys.path}
                      to={workspaceLink(sysEntityRef)}
                      onClick={onNavigate}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-slate-400 transition hover:bg-slate-900/80 hover:text-brand-400"
                    >
                      <SegIcon className="w-3 h-3 shrink-0 text-slate-600" />
                      <span className="truncate">{sys.name}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function DesktopExploreChildMenu({
  nextLevelLabel,
  isOpen,
  onToggle,
  onClose,
  childrenItems,
  workspaceLink,
}: {
  nextLevelLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  childrenItems: BreadcrumbChildItem[];
  workspaceLink: (entityRef: string) => string;
}) {
  return (
    <>
      <div className="w-px h-4 bg-slate-800/80 self-center mx-1 shrink-0" />
      <div className="relative">
        <button
          onClick={onToggle}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider shrink-0 transition focus:outline-none cursor-pointer ${
            isOpen
              ? 'bg-brand-950/50 border-brand-500/30 text-brand-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title="Explore child components"
        >
          <span>Explore {nextLevelLabel} Level</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {isOpen ? (
          <div className="absolute top-full right-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl py-1.5 z-50 min-w-[200px] max-h-[250px] overflow-y-auto backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-150 text-[11px]">
            <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900/60 mb-1">
              Jump to {nextLevelLabel}
            </div>
            {childrenItems.map(child => (
              <Link
                key={child.path}
                to={workspaceLink(child.entityRef)}
                onClick={onClose}
                className="w-full text-left px-3 py-2 hover:bg-slate-900/80 hover:text-brand-400 text-slate-400 transition flex items-center gap-2"
              >
                <Network className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="truncate">{child.name}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function MobileBreadcrumbsMenu({
  menuOpen,
  mobileSummary,
  onToggleMenu,
  modeToggle,
  isWorkspaceOpen,
  workspaceName,
  segmentTrail,
  hasNextLevelChildren,
  nextLevelLabel,
  childrenItems,
  workspaceLink,
  onCloseMenu,
}: {
  menuOpen: boolean;
  mobileSummary: string;
  onToggleMenu: () => void;
  modeToggle: React.ReactNode;
  isWorkspaceOpen: boolean;
  workspaceName?: string;
  segmentTrail: React.ReactNode;
  hasNextLevelChildren: boolean;
  nextLevelLabel: string;
  childrenItems: BreadcrumbChildItem[];
  workspaceLink: (entityRef: string) => string;
  onCloseMenu: () => void;
}) {
  return (
    <div className="lg:hidden relative min-w-0 w-full">
      <button
        type="button"
        onClick={onToggleMenu}
        className={`flex items-center gap-2 min-w-0 w-full max-w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
          menuOpen
            ? 'border-accent/30 bg-cyan-950/25 text-accent'
            : 'border-accent/15 bg-navy/50 text-slate-200 hover:border-accent/25'
        }`}
        aria-expanded={menuOpen}
        aria-controls="breadcrumb-mobile-menu"
        aria-label="Open diagram location menu"
      >
        <Folder className="w-3.5 h-3.5 text-brand-500 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{mobileSummary}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
            menuOpen ? 'rotate-180 text-accent' : 'text-slate-500'
          }`}
        />
      </button>

      {menuOpen ? (
        <div
          id="breadcrumb-mobile-menu"
          className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-slate-900 bg-slate-950/95 py-2 shadow-2xl backdrop-blur-lg max-h-[min(70vh,320px)] overflow-y-auto"
        >
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900/60 mb-1 flex items-center gap-2">
            {modeToggle}
            {isWorkspaceOpen ? <span className="truncate">{workspaceName}</span> : null}
          </div>

          <div className="px-2 space-y-0.5">{segmentTrail}</div>

          {hasNextLevelChildren ? (
            <div className="mt-2 border-t border-slate-900/60 px-2 pt-2">
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Explore {nextLevelLabel}
              </p>
              {childrenItems.map(child => (
                <Link
                  key={child.path}
                  to={workspaceLink(child.entityRef)}
                  onClick={onCloseMenu}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-400 transition hover:bg-slate-900/80 hover:text-brand-400"
                >
                  <Network className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                  <span className="truncate">{child.name}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
