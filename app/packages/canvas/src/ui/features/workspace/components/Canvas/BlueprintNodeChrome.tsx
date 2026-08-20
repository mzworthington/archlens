import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Code, ZoomIn } from 'lucide-react';
import {
  externalNodeBadgeLabel,
  type ExternalNodeKind,
  type SourceProvenance,
} from '@archlens/core';
import { GoToEntityButton } from '../GoToEntityButton';
import { ViewChildExternalsButton } from '../ViewChildExternalsButton';
import type { BlueprintNodeTypeConfig } from './blueprintNodeTypeConfigs';

export const BlueprintNodeHandles: React.FC = () => (
  <>
    {/* Always mount every handle - edges keep layout handle ids; unmounting orphans paths. */}
    <Handle
      type="target"
      position={Position.Left}
      id="left-target"
      className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
    />
    <Handle
      type="source"
      position={Position.Right}
      id="right-source"
      className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
    />
    <Handle
      type="target"
      position={Position.Top}
      id="top-target"
      className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
    />
    <Handle
      type="source"
      position={Position.Top}
      id="top-source"
      className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
    />
    <Handle
      type="target"
      position={Position.Bottom}
      id="bottom-target"
      className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="bottom-source"
      className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
    />
    <Handle
      type="source"
      position={Position.Left}
      id="left-source"
      className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
    />
    <Handle
      type="target"
      position={Position.Right}
      id="right-target"
      className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
    />
  </>
);

type ZoomButtonProps = {
  name: string;
  liteCanvas: boolean;
  onZoom: (e: React.MouseEvent) => void;
};

export const BlueprintNodeZoomButton: React.FC<ZoomButtonProps> = ({
  name,
  liteCanvas,
  onZoom,
}) => {
  const zoomButtonClass = liteCanvas
    ? 'flex items-center gap-1 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 active:bg-brand-500/30 text-brand-400 p-1 rounded transition cursor-pointer z-10'
    : 'flex items-center gap-1 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 active:bg-brand-500/30 text-brand-400 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10 shrink-0';

  return (
    <button
      type="button"
      onClick={onZoom}
      className={zoomButtonClass}
      title="Click to zoom inside"
      aria-label={`Zoom into ${name}`}
      data-testid="zoom-in-button"
    >
      <ZoomIn className="w-2.5 h-2.5" />
      {!liteCanvas ? <span>Zoom</span> : null}
    </button>
  );
};

type HeaderChromeProps = {
  config: BlueprintNodeTypeConfig;
  name: string;
  entityRef?: string;
  canZoom: boolean;
  childExternalsCount: number;
  showSourceCodeButton: boolean;
  sourceFilepath?: string;
  diagramSource?: SourceProvenance;
  isExternal?: boolean;
  isCouplingGhost?: boolean;
  couplingGhostPosition?: { x: number; y: number };
  onViewSource: (filepath: string, source?: SourceProvenance) => void;
  onMaterializeGhost: (args: {
    entityRef?: string;
    filepath: string;
    position: { x: number; y: number };
  }) => void;
  onZoom: (e: React.MouseEvent) => void;
};

/** Icon + action buttons row (hidden in lite canvas mode). */
export const BlueprintNodeHeaderChrome: React.FC<HeaderChromeProps> = ({
  config,
  name,
  entityRef,
  canZoom,
  childExternalsCount,
  showSourceCodeButton,
  sourceFilepath,
  diagramSource,
  isExternal,
  isCouplingGhost,
  couplingGhostPosition,
  onViewSource,
  onMaterializeGhost,
  onZoom,
}) => {
  const Icon = config.icon;
  const zoomButton = canZoom ? (
    <BlueprintNodeZoomButton name={name} liteCanvas={false} onZoom={onZoom} />
  ) : null;
  const addGhostButton =
    isCouplingGhost && sourceFilepath ? (
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onMaterializeGhost({
            entityRef,
            filepath: sourceFilepath,
            position: couplingGhostPosition ?? { x: 0, y: 0 },
          });
        }}
        className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10 shrink-0"
        title="Add this coupled file to the diagram"
        aria-label={`Add ${name} to diagram`}
        data-testid="add-coupling-ghost-button"
      >
        Add
      </button>
    ) : null;

  return (
    <div className="flex items-start justify-between gap-2">
      <div
        className="flex items-center justify-center p-2 rounded-lg border shrink-0"
        style={{
          color: config.color,
          backgroundColor: config.bg,
          borderColor: config.border,
        }}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1 min-w-0">
        {showSourceCodeButton && sourceFilepath ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onViewSource(sourceFilepath, diagramSource);
            }}
            className="flex items-center gap-1 bg-[#00f0ff]/10 border border-[#00f0ff]/30 hover:bg-[#00f0ff]/20 active:bg-[#00f0ff]/30 text-[#00f0ff] px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10 shrink-0"
            title="View source code"
            aria-label="View source code"
            data-testid="view-source-button"
          >
            <Code className="w-2.5 h-2.5" />
            <span>Code</span>
          </button>
        ) : null}

        {isExternal && entityRef ? <GoToEntityButton entityRef={entityRef} /> : null}

        {canZoom && entityRef && childExternalsCount > 0 ? (
          <ViewChildExternalsButton
            parentEntityRef={entityRef}
            externalsCount={childExternalsCount}
            className="flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 active:bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10 shrink-0"
          />
        ) : null}

        {zoomButton}
        {addGhostButton}
      </div>
    </div>
  );
};

type TitleProps = {
  name: string;
  id: string;
  entityRef?: string;
  liteCanvas: boolean;
  hiddenExternalGhost?: boolean;
  couplingGhost?: boolean;
  externalKind: ExternalNodeKind | null;
};

export const BlueprintNodeTitle: React.FC<TitleProps> = ({
  name,
  id,
  entityRef,
  liteCanvas,
  hiddenExternalGhost,
  couplingGhost,
  externalKind,
}) => (
  <div className={`${liteCanvas ? '' : 'mt-3'} min-w-0 overflow-hidden`}>
    <h4 className="font-semibold text-slate-100 truncate text-base leading-tight" title={name}>
      {name}
      {hiddenExternalGhost ? (
        <span className="text-[10px] text-cyan-300/90 font-normal ml-1.5">(Hidden)</span>
      ) : couplingGhost ? (
        <span className="text-[10px] text-amber-300/90 font-normal ml-1.5">(Coupled)</span>
      ) : externalKind ? (
        <span
          className={
            externalKind === 'third-party'
              ? 'text-[10px] text-amber-400/90 font-normal ml-1.5'
              : 'text-[10px] text-cyan-400/90 font-normal ml-1.5'
          }
        >
          {externalNodeBadgeLabel(externalKind)}
        </span>
      ) : null}
    </h4>
    <p
      className="text-xs text-slate-200 font-mono mt-1 truncate select-all"
      title={entityRef || id}
    >
      <span dir="rtl" className="block truncate">
        <bdi>{entityRef || id}</bdi>
      </span>
    </p>
  </div>
);

type ExternalSummaryHubProps = {
  band: 'callers' | 'targets';
  count: number;
  onClick: (e: React.MouseEvent) => void;
};

export const BlueprintNodeExternalSummaryHub: React.FC<ExternalSummaryHubProps> = ({
  band,
  count,
  onClick,
}) => {
  const bandLabel = band === 'callers' ? 'External callers' : 'External targets';
  return (
    <div
      onClick={onClick}
      data-testid={`external-summary-hub-${band}`}
      className={`relative w-72 rounded-xl border border-dashed p-4 cursor-pointer transition-colors ${
        band === 'callers'
          ? 'border-sky-500/60 bg-sky-950/40 hover:border-sky-400'
          : 'border-cyan-500/60 bg-cyan-950/40 hover:border-cyan-400'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{bandLabel}</p>
      <h4 className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{count}</h4>
      <p className="mt-2 text-xs text-slate-400">Click to expand cross-diagram dependencies</p>
    </div>
  );
};
