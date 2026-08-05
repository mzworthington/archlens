import React from 'react';
import { Trash2 } from 'lucide-react';
import type { NodeFaultConfig } from '@archlens/core/resilience';
import type { EntityRef } from '@archlens/core';

const FAULT_LABELS: Record<NodeFaultConfig['faultType'], string> = {
  latency: 'High latency',
  'error-rate': '5xx error rate',
  'packet-loss': 'Packet loss',
  'region-outage': 'Region outage',
};

type Props = {
  faults: NodeFaultConfig[];
  selectedNodeId: EntityRef | null;
  nodeNameByRef: Map<EntityRef, string>;
  onSelectFault: (nodeId: EntityRef) => void;
  onRemoveFault: (nodeId: EntityRef) => void;
};

export const FaultScenarioList: React.FC<Props> = ({
  faults,
  selectedNodeId,
  nodeNameByRef,
  onSelectFault,
  onRemoveFault,
}) => {
  if (faults.length === 0) {
    return (
      <p className="text-xs text-slate-500 leading-relaxed" data-testid="fault-scenario-empty">
        No faults in the scenario yet. Select a node, configure a condition, then add it below.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5" data-testid="fault-scenario-list">
      {faults.map(fault => {
        const label = nodeNameByRef.get(fault.nodeId) ?? fault.nodeId;
        const severity = fault.severity ?? null;
        const isActive = selectedNodeId === fault.nodeId;

        return (
          <li key={fault.nodeId}>
            <div
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition ${
                isActive
                  ? 'border-[#00f0ff]/40 bg-[#00f0ff]/10'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectFault(fault.nodeId)}
                className="min-w-0 flex-1 text-left cursor-pointer"
                data-testid={`fault-scenario-item-${fault.nodeId}`}
              >
                <span className="block text-sm font-medium text-slate-100 truncate">{label}</span>
                <span className="block text-[11px] text-slate-500 font-mono">
                  {FAULT_LABELS[fault.faultType]}
                  {severity != null ? ` · ${Math.round(severity * 100)}%` : ''}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemoveFault(fault.nodeId)}
                className="shrink-0 p-1.5 rounded-md text-slate-500 hover:text-red-300 hover:bg-slate-900 transition cursor-pointer"
                aria-label={`Remove fault on ${label}`}
                data-testid={`fault-scenario-remove-${fault.nodeId}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
