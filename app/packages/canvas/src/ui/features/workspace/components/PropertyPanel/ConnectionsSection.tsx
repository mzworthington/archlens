import React from 'react';
import { Trash2, Crosshair } from 'lucide-react';
import type { SystemDependency, SystemNode } from '@archlens/core';
import type { BlueprintRFEdge } from '../../../../../application/store/layoutUtils';

interface ConnectionsSectionProps {
  selectedNodeId: string;
  schemaNodes: SystemNode[];
  connections: BlueprintRFEdge[];
  upstreamTotal: number;
  downstreamTotal: number;
  selectedConnectionId: string | null;
  onSelectNode: (id: string) => void;
  onSpotlightConnection: (edgeId: string) => void;
  onUpdateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => void;
  onDeleteDependency: (from: string, to: string) => void;
}

function ConnectionCard({
  edge,
  selectedNodeId,
  schemaNodes,
  direction,
  isSpotlighted,
  onSelectNode,
  onSpotlightConnection,
  onUpdateDependency,
  onDeleteDependency,
}: {
  edge: BlueprintRFEdge;
  selectedNodeId: string;
  schemaNodes: SystemNode[];
  direction: 'upstream' | 'downstream';
  isSpotlighted: boolean;
  onSelectNode: (id: string) => void;
  onSpotlightConnection: (edgeId: string) => void;
  onUpdateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => void;
  onDeleteDependency: (from: string, to: string) => void;
}) {
  const isSource = edge.source === selectedNodeId;
  const partnerId = isSource ? edge.target : edge.source;
  const partnerNode = schemaNodes.find(n => n.entityRef === partnerId);

  return (
    <div
      className={`bg-slate-950/40 rounded-xl p-2.5 border space-y-2 ${
        isSpotlighted ? 'border-brand-500/60 ring-1 ring-brand-500/20' : 'border-slate-900'
      }`}
      data-testid={`connection-card-${edge.id}`}
    >
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="font-semibold text-slate-300 font-sans min-w-0">
          {direction === 'downstream' ? '➔ Output to' : '📥 Input from'}{' '}
          <button
            type="button"
            onClick={() => onSelectNode(partnerId)}
            className="text-brand-400 hover:text-brand-300 cursor-pointer truncate max-w-[10rem] inline-block align-bottom"
            title={partnerNode?.name || partnerId}
          >
            {partnerNode?.name || partnerId}
          </button>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSpotlightConnection(edge.id)}
            className="text-slate-500 hover:text-brand-300 transition cursor-pointer p-0.5"
            aria-label={`Show connection on canvas (${partnerNode?.name || partnerId})`}
            title="Show on canvas"
            data-testid={`spotlight-connection-${edge.id}`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteDependency(edge.source, edge.target)}
            className="text-slate-500 hover:text-red-400 transition cursor-pointer"
            aria-label="Delete dependency"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <select
          value={edge.data?.type || 'direct-call'}
          onChange={e =>
            onUpdateDependency(edge.source, edge.target, {
              type: e.target.value as SystemDependency['type'],
            })
          }
          className="flex-1 bg-slate-950/60 border border-slate-800 focus:border-brand-500 rounded px-1.5 py-1 text-[10px] font-mono text-slate-200 focus:outline-none transition duration-200"
        >
          <option value="direct-call">Direct Call</option>
          <option value="publish-subscribe">Pub/Sub (Async)</option>
          <option value="read-write">Read/Write</option>
        </select>
        <input
          type="text"
          placeholder="Add description (e.g. JSON/HTTPS)"
          value={edge.data?.description || ''}
          onChange={e =>
            onUpdateDependency(edge.source, edge.target, {
              description: e.target.value,
            })
          }
          className="w-full bg-slate-950/60 border border-slate-800 focus:border-brand-500 rounded px-2 py-1 text-[10px] font-mono text-slate-200 focus:outline-none transition duration-200 focus:shadow-[0_0_8px_rgba(139,92,246,0.15)]"
        />
      </div>
    </div>
  );
}

export const ConnectionsSection: React.FC<ConnectionsSectionProps> = ({
  selectedNodeId,
  schemaNodes,
  connections,
  upstreamTotal,
  downstreamTotal,
  selectedConnectionId,
  onSelectNode,
  onSpotlightConnection,
  onUpdateDependency,
  onDeleteDependency,
}) => {
  const upstream = connections.filter(edge => edge.target === selectedNodeId);
  const downstream = connections.filter(edge => edge.source === selectedNodeId);

  return (
    <div className="border-t border-slate-900 pt-4" data-testid="connections-section">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider">
          Active Connections
        </h4>
        {(upstreamTotal > 0 || downstreamTotal > 0) && (
          <span className="text-[10px] font-mono text-slate-500">
            {upstreamTotal} upstream · {downstreamTotal} downstream
          </span>
        )}
      </div>
      <p className="text-[10px] leading-snug text-slate-500 mb-3">
        Use the crosshair to spotlight a connection on the canvas. Hidden externals appear as dashed
        cyan ghosts while dependency focus is on.
      </p>
      {connections.length > 0 ? (
        <div className="space-y-4">
          {upstream.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-violet-400/80">
                Upstream
              </p>
              {upstream.map(edge => (
                <ConnectionCard
                  key={edge.id}
                  edge={edge}
                  selectedNodeId={selectedNodeId}
                  schemaNodes={schemaNodes}
                  direction="upstream"
                  isSpotlighted={selectedConnectionId === edge.id}
                  onSelectNode={onSelectNode}
                  onSpotlightConnection={onSpotlightConnection}
                  onUpdateDependency={onUpdateDependency}
                  onDeleteDependency={onDeleteDependency}
                />
              ))}
            </div>
          ) : null}
          {downstream.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80">
                Downstream
              </p>
              {downstream.map(edge => (
                <ConnectionCard
                  key={edge.id}
                  edge={edge}
                  selectedNodeId={selectedNodeId}
                  schemaNodes={schemaNodes}
                  direction="downstream"
                  isSpotlighted={selectedConnectionId === edge.id}
                  onSelectNode={onSelectNode}
                  onSpotlightConnection={onSpotlightConnection}
                  onUpdateDependency={onUpdateDependency}
                  onDeleteDependency={onDeleteDependency}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No connections established.</p>
      )}
    </div>
  );
};
