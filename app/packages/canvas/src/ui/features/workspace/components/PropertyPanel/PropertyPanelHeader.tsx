import React from 'react';
import type { PropertyPanelModel } from './usePropertyPanelModel';

type PropertyPanelHeaderProps = Pick<PropertyPanelModel, 'toggleRightCollapsed'>;

export const PropertyPanelHeader: React.FC<PropertyPanelHeaderProps> = ({
  toggleRightCollapsed,
}) => (
  <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/40">
    <h3 className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs">
      Properties Panel
    </h3>
    <div className="flex items-center gap-2">
      <button
        onClick={toggleRightCollapsed}
        className="sm:hidden min-h-11 min-w-11 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center justify-center text-sm"
        title="Close Panel"
        aria-label="Close Properties Panel"
      >
        ✕
      </button>
    </div>
  </div>
);
