import React from 'react';
import type { LeftSlotPanelId } from '../../../../application/layout/workspacePanels';

type Props = {
  activeTab: LeftSlotPanelId;
  onTabChange: (tab: LeftSlotPanelId) => void;
};

const tabClass = (active: boolean) =>
  `flex-1 px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition cursor-pointer border-b-2 ${
    active
      ? 'border-[#00f0ff] text-[#00f0ff] bg-[#00f0ff]/5'
      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
  }`;

export const LeftPanelTabs: React.FC<Props> = ({ activeTab, onTabChange }) => (
  <div
    className="flex shrink-0 border-b border-slate-900 bg-slate-950/60"
    data-testid="left-panel-tabs"
    role="tablist"
    aria-label="Left workspace panel"
  >
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'traceLens'}
      className={tabClass(activeTab === 'traceLens')}
      onClick={() => onTabChange('traceLens')}
      data-testid="left-tab-tracelens"
    >
      TraceLens
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'codeViewer'}
      className={tabClass(activeTab === 'codeViewer')}
      onClick={() => onTabChange('codeViewer')}
      data-testid="left-tab-schema"
    >
      Schema
    </button>
  </div>
);
