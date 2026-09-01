import React, { useEffect } from 'react';
import { Flag, X } from 'lucide-react';
import {
  FEATURE_FLAGS,
  setFeatureEnabled,
} from '../../../../../application/navigation/featureGate';
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';

interface FeatureFlagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function FeatureFlagSwitch({
  id,
  label,
  description,
}: {
  id: string;
  label: string;
  description: string;
}) {
  const enabled = useFeatureFlag(id);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        data-testid={`feature-flag-${id}`}
        onClick={() => setFeatureEnabled(id, !enabled)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          enabled ? 'bg-brand-500' : 'bg-slate-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export const FeatureFlagsDialog: React.FC<FeatureFlagsDialogProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feature-flags-title"
      data-testid="feature-flags-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#00f0ff]" aria-hidden="true" />
              <h2 id="feature-flags-title" className="text-base font-bold text-white">
                Feature flags
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              aria-label="Close feature flags"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <ul className="space-y-4">
              {FEATURE_FLAGS.map(flag => (
                <li key={flag.id}>
                  <FeatureFlagSwitch
                    id={flag.id}
                    label={flag.label}
                    description={flag.description}
                  />
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-600 pt-2 border-t border-slate-900">
              These stay on in this browser until you turn them off.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
