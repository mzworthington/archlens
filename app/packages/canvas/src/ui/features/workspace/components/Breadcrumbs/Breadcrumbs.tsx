import React from 'react';
import { Folder, ChevronRight, Layers, Compass, Code, Network, ChevronDown } from 'lucide-react';
import { Link, useLocation, useSearch } from 'wouter';
import { getSchemaEntityRef, type C4Level, type SystemSchema } from '@archlens/core';
import { useBreadcrumbs } from './useBreadcrumbs';
import { WorkspaceModeToggle } from './WorkspaceModeToggle';
import { BlankCanvasFileSave } from './BlankCanvasFileSave';
import { buildWorkspaceEntityHref } from '../../../../../application/store/sandboxWorkspace';
import { useBlueprintStore } from '../../../../../application/store/store';
import { navigateToActiveWorkspaceEntity } from '../../hooks/navigateToActiveWorkspaceEntity';
import { SAMPLES_ENTITY_REF } from '../../../../../application/store/samplesWorkspace';

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

type BreadcrumbSegmentView = {
  name: string;
  path: string;
  level: C4Level;
  entityRef: string;
  isZoomPreview: boolean;
  sameLevelSystems?: { path: string; name: string; schema: SystemSchema }[];
};

export const Breadcrumbs: React.FC = () => {
  const {
    openDropdownIdx,
    setOpenDropdownIdx,
    dropdownRef,
    activeLevel,
    segments,
    hasNextLevelChildren,
    currentChildren,
    getNextLevel,
    isWorkspaceOpen,
    isSampleWorkspace,
    workspaceName,
  } = useBreadcrumbs();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const isLoading = useBlueprintStore(s => s.isLoading);
  const openBundledSample = useBlueprintStore(s => s.openBundledSample);
  const openWorkspaceDirectory = useBlueprintStore(s => s.openWorkspaceDirectory);
  const setIsStartupOpen = useBlueprintStore(s => s.setIsStartupOpen);
  const workspaceLink = (entityRef: string) =>
    buildWorkspaceEntityHref(entityRef, { pathname: location, search });
  const segmentList = segments as BreadcrumbSegmentView[];
  const modeSwitchDisabled = Boolean(isLoading);

  const handleEnableDemo = () => {
    if (isSampleWorkspace || modeSwitchDisabled) return;
    void (async () => {
      const opened = await openBundledSample();
      if (!opened) return;
      setIsStartupOpen(false);
      setLocation(buildWorkspaceEntityHref(SAMPLES_ENTITY_REF), { replace: true });
    })();
  };

  const handleEnableFolder = () => {
    if (modeSwitchDisabled) return;
    void (async () => {
      try {
        const opened = await openWorkspaceDirectory();
        if (!opened) return;
        setIsStartupOpen(false);
        navigateToActiveWorkspaceEntity(setLocation);
      } catch (err) {
        console.error('Failed to open workspace directory:', err);
      }
    })();
  };

  const modeToggle = (
    <WorkspaceModeToggle
      isWorkspaceOpen={isWorkspaceOpen}
      isSampleWorkspace={isSampleWorkspace}
      onEnableDemo={handleEnableDemo}
      onEnableFolder={handleEnableFolder}
      disabled={modeSwitchDisabled}
    />
  );

  const menuOpen = openDropdownIdx === -1;
  const lastSegment = segmentList[segmentList.length - 1];
  const mobileSummary =
    segmentList.length > 1 && segmentList[segmentList.length - 2]
      ? `${segmentList[segmentList.length - 2].name} › ${lastSegment?.name ?? ''}`
      : (lastSegment?.name ?? 'Diagram');

  const renderSegmentLinks = (onNavigate?: () => void, compact = false) =>
    segmentList.map((seg, idx) => {
      const isLast = idx === segmentList.length - 1;
      const isClickable = !isLast || seg.isZoomPreview;
      const segConfig = LEVEL_CONFIGS[seg.level];
      const SegIcon = segConfig.icon;
      const sameLevelSystems = seg.sameLevelSystems ?? [];

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
                    className={
                      compact
                        ? `flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${
                            seg.isZoomPreview
                              ? 'border border-brand-500/20 bg-brand-950/20 text-brand-300'
                              : isLast
                                ? 'font-semibold text-slate-100'
                                : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-100'
                          }`
                        : `flex items-center gap-1.5 transition text-left focus:outline-none shrink-0 ${
                            seg.isZoomPreview
                              ? 'text-brand-400 hover:text-brand-300 font-medium cursor-pointer border border-brand-500/20 px-2 py-0.5 rounded bg-brand-950/20 hover:bg-brand-950/45'
                              : 'text-slate-500 hover:text-slate-200 cursor-pointer'
                          }`
                    }
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
                        setOpenDropdownIdx(openDropdownIdx === idx ? null : idx);
                      }}
                      className={`p-0.5 rounded hover:bg-slate-900 transition focus:outline-none cursor-pointer shrink-0 ${
                        openDropdownIdx === idx
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
                    setOpenDropdownIdx(openDropdownIdx === idx ? null : idx);
                  }}
                  className={`flex items-center gap-1 hover:text-slate-200 transition text-left focus:outline-none shrink-0 font-semibold cursor-pointer ${
                    openDropdownIdx === idx ? 'text-brand-400' : 'text-slate-100'
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
                    setLocation(
                      workspaceLink(getSchemaEntityRef(nextSchema, nextWorkspace || undefined)),
                      { replace: true }
                    );
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
                  <span className={compact ? 'truncate' : 'truncate max-w-[80px] sm:max-w-[150px]'}>
                    {seg.name}
                  </span>
                </div>
              )}

              {!compact && openDropdownIdx === idx && sameLevelSystems.length > 0 ? (
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
    });

  const closeMenu = () => setOpenDropdownIdx(null);

  return (
    <div ref={dropdownRef} className="min-w-0 w-full">
      {/* Desktop: inline trail */}
      <div className="hidden lg:flex flex-wrap items-center gap-y-1.5 gap-x-2.5 text-xs select-none w-full">
        <Folder className="w-3.5 h-3.5 text-brand-500 shrink-0" />

        <div className="flex items-center gap-1.5 min-w-0">
          {modeToggle}
          {isWorkspaceOpen ? (
            <span
              className="max-w-[100px] sm:max-w-[150px] truncate text-slate-400 font-medium"
              title={workspaceName}
            >
              {workspaceName}
            </span>
          ) : null}
        </div>

        {isWorkspaceOpen ? <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" /> : null}

        <div className="flex flex-wrap items-center gap-1.5">{renderSegmentLinks()}</div>

        {hasNextLevelChildren ? (
          <>
            <div className="w-px h-4 bg-slate-800/80 self-center mx-1 shrink-0" />
            <div className="relative">
              <button
                onClick={() => setOpenDropdownIdx(openDropdownIdx === 999 ? null : 999)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider shrink-0 transition focus:outline-none cursor-pointer ${
                  openDropdownIdx === 999
                    ? 'bg-brand-950/50 border-brand-500/30 text-brand-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
                title="Explore child components"
              >
                <span>Explore {getNextLevel(activeLevel)} Level</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {openDropdownIdx === 999 ? (
                <div className="absolute top-full right-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl py-1.5 z-50 min-w-[200px] max-h-[250px] overflow-y-auto backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-150 text-[11px]">
                  <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900/60 mb-1">
                    Jump to {getNextLevel(activeLevel)}
                  </div>
                  {(
                    currentChildren as Array<{ path: string; name: string; entityRef: string }>
                  ).map(child => (
                    <Link
                      key={child.path}
                      to={workspaceLink(child.entityRef)}
                      onClick={() => setOpenDropdownIdx(null)}
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
        ) : null}
      </div>

      {/* Mobile: summary chip + dropdown menu */}
      <div className="lg:hidden relative min-w-0 w-full">
        <button
          type="button"
          onClick={() => setOpenDropdownIdx(menuOpen ? null : -1)}
          className={`flex items-center gap-2 min-w-0 w-full max-w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
            menuOpen
              ? 'border-[#00f0ff]/30 bg-cyan-950/25 text-[#00f0ff]'
              : 'border-[#00f0ff]/15 bg-[#040914]/50 text-slate-200 hover:border-[#00f0ff]/25'
          }`}
          aria-expanded={menuOpen}
          aria-controls="breadcrumb-mobile-menu"
          aria-label="Open diagram location menu"
        >
          <Folder className="w-3.5 h-3.5 text-brand-500 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{mobileSummary}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${
              menuOpen ? 'rotate-180 text-[#00f0ff]' : 'text-slate-500'
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

            <div className="px-2 space-y-0.5">{renderSegmentLinks(closeMenu, true)}</div>

            {hasNextLevelChildren ? (
              <div className="mt-2 border-t border-slate-900/60 px-2 pt-2">
                <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Explore {getNextLevel(activeLevel)}
                </p>
                {(currentChildren as Array<{ path: string; name: string; entityRef: string }>).map(
                  child => (
                    <Link
                      key={child.path}
                      to={workspaceLink(child.entityRef)}
                      onClick={closeMenu}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-400 transition hover:bg-slate-900/80 hover:text-brand-400"
                    >
                      <Network className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                      <span className="truncate">{child.name}</span>
                    </Link>
                  )
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
