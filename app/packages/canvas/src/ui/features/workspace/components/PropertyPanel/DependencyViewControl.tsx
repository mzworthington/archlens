import React from 'react';
import type { DependencyViewMode } from '../../../../../application/forensics/dependencyViewMode';

const MODES: Array<{ id: DependencyViewMode; label: string }> = [
  { id: 'full', label: 'Full' },
  { id: 'focus', label: 'Focus' },
  { id: 'focus-externals', label: 'Tree + externals' },
];

type Props = {
  mode: DependencyViewMode;
  onChange: (mode: DependencyViewMode) => void;
  disabled?: boolean;
};

export const DependencyViewControl: React.FC<Props> = ({ mode, onChange, disabled }) => (
  <div className="border-t border-slate-900 pt-4 space-y-2" data-testid="dependency-view-control">
    <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider">
      Dependency view
    </h4>
    <div
      className="flex rounded-lg border border-slate-850 overflow-hidden"
      role="group"
      aria-label="Dependency view mode"
    >
      {MODES.map(option => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            data-testid={`dependency-view-${option.id}`}
            onClick={() => onChange(option.id)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-semibold tracking-wide transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              active
                ? 'bg-brand-500/20 text-brand-300'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
    <p className="text-[10px] leading-snug text-slate-500">
      Tree + externals includes cross-diagram services connected anywhere in the focused dependency
      path.
    </p>
  </div>
);
