import React from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { useBreadcrumbs } from './useBreadcrumbs';
import { WorkspaceModeToggle } from './WorkspaceModeToggle';
import {
  BreadcrumbSegmentTrail,
  DesktopExploreChildMenu,
  MobileBreadcrumbsMenu,
  type BreadcrumbChildItem,
  type BreadcrumbSegmentView,
} from './BreadcrumbParts';
import { buildWorkspaceEntityHref } from '../../../../../application/store/sandboxWorkspace';
import { useBlueprintStore } from '../../../../../application/store/store';
import { navigateToActiveWorkspaceEntity } from '../../hooks/navigateToActiveWorkspaceEntity';
import { SAMPLES_ENTITY_REF } from '../../../../../application/store/samplesWorkspace';

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
  const childrenItems = currentChildren as BreadcrumbChildItem[];
  const modeSwitchDisabled = Boolean(isLoading);
  const nextLevelLabel = String(getNextLevel(activeLevel) ?? '');

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
  const prevSegment = segmentList.length > 1 ? segmentList[segmentList.length - 2] : undefined;
  const mobileSummary = prevSegment
    ? `${prevSegment.name} › ${lastSegment?.name ?? ''}`
    : (lastSegment?.name ?? 'Diagram');
  const closeMenu = () => setOpenDropdownIdx(null);
  const handleSavedNavigate = (entityRef: string) => {
    setLocation(workspaceLink(entityRef), { replace: true });
  };

  return (
    <div ref={dropdownRef} className="min-w-0 w-full">
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

        <div className="flex flex-wrap items-center gap-1.5">
          <BreadcrumbSegmentTrail
            segments={segmentList}
            isWorkspaceOpen={isWorkspaceOpen}
            workspaceName={workspaceName}
            openDropdownIdx={openDropdownIdx}
            setOpenDropdownIdx={setOpenDropdownIdx}
            workspaceLink={workspaceLink}
            onSavedNavigate={handleSavedNavigate}
          />
        </div>

        {hasNextLevelChildren ? (
          <DesktopExploreChildMenu
            nextLevelLabel={nextLevelLabel}
            isOpen={openDropdownIdx === 999}
            onToggle={() => setOpenDropdownIdx(openDropdownIdx === 999 ? null : 999)}
            onClose={closeMenu}
            childrenItems={childrenItems}
            workspaceLink={workspaceLink}
          />
        ) : null}
      </div>

      <MobileBreadcrumbsMenu
        menuOpen={menuOpen}
        mobileSummary={mobileSummary}
        onToggleMenu={() => setOpenDropdownIdx(menuOpen ? null : -1)}
        modeToggle={modeToggle}
        isWorkspaceOpen={isWorkspaceOpen}
        workspaceName={workspaceName}
        segmentTrail={
          <BreadcrumbSegmentTrail
            segments={segmentList}
            compact
            isWorkspaceOpen={isWorkspaceOpen}
            workspaceName={workspaceName}
            openDropdownIdx={openDropdownIdx}
            setOpenDropdownIdx={setOpenDropdownIdx}
            workspaceLink={workspaceLink}
            onNavigate={closeMenu}
            onSavedNavigate={handleSavedNavigate}
          />
        }
        hasNextLevelChildren={hasNextLevelChildren}
        nextLevelLabel={nextLevelLabel}
        childrenItems={childrenItems}
        workspaceLink={workspaceLink}
        onCloseMenu={closeMenu}
      />
    </div>
  );
};
