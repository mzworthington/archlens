import React, { useState } from 'react';
import { DocsShell } from './DocsShell';
import { DesignSystemShowcase } from '../../components/DesignSystemShowcase';
import {
  DESIGN_SYSTEM_SECTIONS,
  isDesignSystemSectionId,
  type DesignSystemSectionId,
} from '../../components/designSystemSections';

export const DesignSystemDocsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DesignSystemSectionId>('identity');

  return (
    <DocsShell
      localNav={{
        title: 'On this page',
        expandUnderPath: '/design-system',
        items: DESIGN_SYSTEM_SECTIONS.map(section => ({
          id: section.id,
          label: section.label,
        })),
        activeId: activeTab,
        onSelect: id => {
          if (isDesignSystemSectionId(id)) setActiveTab(id);
        },
      }}
    >
      <header className="mb-8 border-b border-[#00f0ff]/10 pb-6">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
          Design system
        </p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Design system</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400 leading-relaxed">
          Tokens, components and visual patterns shared across the homepage, docs and canvas.
        </p>
      </header>
      <DesignSystemShowcase embedded activeTab={activeTab} onTabChange={setActiveTab} />
    </DocsShell>
  );
};
