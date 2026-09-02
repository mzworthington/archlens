import React from 'react';
import type { RightPanelTabId } from '../../../../../application/layout/rightPanelTab';

type Props = {
  activeTab: RightPanelTabId;
  onTabChange: (tab: RightPanelTabId) => void;
};

const tabClass = (active: boolean) =>
  `flex-1 px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition cursor-pointer border-b-2 ${
    active
      ? 'border-[#00f0ff] text-[#00f0ff] bg-[#00f0ff]/5'
      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
  }`;

export const RightPanelTabs: React.FC<Props> = ({ activeTab, onTabChange }) => (
  <div
    className="flex shrink-0 border-b border-slate-900 bg-slate-950/60"
    data-testid="right-panel-tabs"
    role="tablist"
    aria-label="Right workspace panel"
  >
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'properties'}
      className={tabClass(activeTab === 'properties')}
      onClick={() => onTabChange('properties')}
      data-testid="right-tab-properties"
    >
      Properties
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'catalog'}
      className={tabClass(activeTab === 'catalog')}
      onClick={() => onTabChange('catalog')}
      data-testid="right-tab-catalog"
    >
      Catalog
    </button>
  </div>
);
