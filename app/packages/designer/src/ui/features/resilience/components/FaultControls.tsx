import React from 'react';
import type { FaultType, NodeSafeguards } from '@blueprint/core/resilience';

const FAULT_TYPES: { id: FaultType; label: string }[] = [
  { id: 'latency', label: 'High latency' },
  { id: 'error-rate', label: '5xx error rate' },
  { id: 'packet-loss', label: 'Packet loss' },
  { id: 'region-outage', label: 'Region outage' },
];

const SAFEGUARD_TOGGLES: { key: keyof NodeSafeguards; label: string }[] = [
  { key: 'circuitBreaker', label: 'Circuit breaker' },
  { key: 'bulkhead', label: 'Bulkhead' },
  { key: 'retry', label: 'Retry' },
  { key: 'localCache', label: 'Local cache' },
];

type Props = {
  selectedNodeLabel: string | null;
  faultType: FaultType;
  severity: number;
  safeguards: NodeSafeguards;
  onFaultTypeChange: (faultType: FaultType) => void;
  onSeverityChange: (severity: number) => void;
  onSafeguardChange: (key: keyof NodeSafeguards, enabled: boolean) => void;
};

export const FaultControls: React.FC<Props> = ({
  selectedNodeLabel,
  faultType,
  severity,
  safeguards,
  onFaultTypeChange,
  onSeverityChange,
  onSafeguardChange,
}) => {
  return (
    <div className="space-y-5" data-testid="fault-controls">
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#00f0ff] mb-2">
          Fault injection
        </h2>
        <p className="text-sm text-slate-400">
          {selectedNodeLabel
            ? `Target: ${selectedNodeLabel}`
            : 'Select a node on the canvas to configure a fault.'}
        </p>
      </div>

      <fieldset className="space-y-2" disabled={!selectedNodeLabel}>
        <legend className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Condition
        </legend>
        {FAULT_TYPES.map(type => (
          <label key={type.id} className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="fault-type"
              checked={faultType === type.id}
              onChange={() => onFaultTypeChange(type.id)}
              className="accent-[#00f0ff]"
            />
            {type.label}
          </label>
        ))}
      </fieldset>

      <fieldset disabled={!selectedNodeLabel}>
        <legend className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Severity ({Math.round(severity * 100)}%)
        </legend>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(severity * 100)}
          onChange={e => onSeverityChange(Number(e.target.value) / 100)}
          className="w-full accent-[#00f0ff]"
        />
      </fieldset>

      <fieldset className="space-y-2" disabled={!selectedNodeLabel}>
        <legend className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Safeguards
        </legend>
        {SAFEGUARD_TOGGLES.map(toggle => (
          <label key={toggle.key} className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={Boolean(safeguards[toggle.key])}
              onChange={e => onSafeguardChange(toggle.key, e.target.checked)}
              className="accent-[#00f0ff]"
            />
            {toggle.label}
          </label>
        ))}
      </fieldset>
    </div>
  );
};
