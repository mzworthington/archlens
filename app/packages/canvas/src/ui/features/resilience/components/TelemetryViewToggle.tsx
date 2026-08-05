import React from 'react';
import type { TelemetryViewMode } from '@archlens/core/resilience';

type Props = {
  view: TelemetryViewMode;
  onViewChange: (view: TelemetryViewMode) => void;
};

const buttonClass = (active: boolean) =>
  `flex-1 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition cursor-pointer ${
    active
      ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/40'
      : 'bg-slate-950 text-slate-500 hover:text-slate-300 hover:bg-slate-900'
  }`;

export const TelemetryViewToggle: React.FC<Props> = ({ view, onViewChange }) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
        Telemetry view
      </span>
      <div
        className="flex rounded-md border border-slate-800 overflow-hidden"
        role="group"
        aria-label="Telemetry view"
        data-testid="telemetry-view-toggle"
      >
        <button
          type="button"
          aria-pressed={view === 'sre'}
          className={buttonClass(view === 'sre')}
          onClick={() => onViewChange('sre')}
          data-testid="telemetry-view-sre"
        >
          SRE
        </button>
        <button
          type="button"
          aria-pressed={view === 'executive'}
          className={buttonClass(view === 'executive')}
          onClick={() => onViewChange('executive')}
          data-testid="telemetry-view-executive"
        >
          Executive
        </button>
      </div>
    </div>
  );
};
