import React from 'react';
import type { ResiliencePanelTab } from '../../../../../application/store/states/resilienceState';

type Props = {
  activeTab: ResiliencePanelTab;
  onTabChange: (tab: ResiliencePanelTab) => void;
};

const tabClass = (active: boolean) =>
  `flex-1 px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition cursor-pointer border-b-2 ${
    active
      ? 'border-[#00f0ff] text-[#00f0ff] bg-[#00f0ff]/5'
      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
  }`;

export const ResiliencePanelTabs: React.FC<Props> = ({ activeTab, onTabChange }) => {
  return (
    <div
      className="flex border-b border-slate-900 bg-slate-950/60"
      data-testid="resilience-panel-tabs"
      role="tablist"
      aria-label="ChaosLens panel"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'simulation'}
        className={tabClass(activeTab === 'simulation')}
        onClick={() => onTabChange('simulation')}
        data-testid="resilience-tab-simulation"
      >
        Simulation
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'properties'}
        className={tabClass(activeTab === 'properties')}
        onClick={() => onTabChange('properties')}
        data-testid="resilience-tab-properties"
      >
        Properties
      </button>
    </div>
  );
};
