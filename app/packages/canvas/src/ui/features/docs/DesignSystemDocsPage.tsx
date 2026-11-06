import React, { useEffect, useState } from 'react';
import { DocsShell } from './DocsShell';
import { DesignSystemShowcase } from '../../components/DesignSystemShowcase';
import {
  DESIGN_SYSTEM_SECTIONS,
  isDesignSystemSectionId,
  type DesignSystemSectionId,
} from '../../components/designSystemSections';
import {
  applyDesignTheme,
  readDesignTheme,
  writeDesignTheme,
  type DesignThemeId,
} from '../../../infrastructure/theme/designTheme';

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export const DesignSystemDocsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DesignSystemSectionId>('identity');
  const [theme, setTheme] = useState<DesignThemeId>(() => readDesignTheme(browserStorage()));

  useEffect(() => {
    applyDesignTheme(document.documentElement, theme);
    return () => {
      applyDesignTheme(document.documentElement, 'blueprint');
    };
  }, [theme]);

  const chooseTheme = (next: DesignThemeId) => {
    setTheme(next);
    writeDesignTheme(browserStorage(), next);
  };

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
      <header className="mb-8 border-b border-accent/10 pb-6">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
          Design system
        </p>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Design system</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400 leading-relaxed">
          Tokens, components and visual patterns shared across the homepage, docs and canvas. Light
          is drafting paper: pale canvas, white surface, dark ink, teal used as a spare accent.
        </p>
        <div
          className="mt-4 flex gap-2"
          role="radiogroup"
          aria-label={
            theme === 'light' ? 'Design, Light is selected' : 'Design, Blueprint is selected'
          }
        >
          {(['blueprint', 'light'] as const).map(id => (
            <label
              key={id}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-mono uppercase tracking-wider ${
                theme === id
                  ? 'border-accent/30 bg-accent/15 text-accent'
                  : 'border-accent/10 text-ink'
              }`}
            >
              <input
                type="radio"
                name="design-theme"
                value={id}
                checked={theme === id}
                onChange={() => chooseTheme(id)}
                className="sr-only"
              />
              {id === 'blueprint' ? 'Blueprint' : 'Light'}
            </label>
          ))}
        </div>
      </header>
      <DesignSystemShowcase
        embedded
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
      />
    </DocsShell>
  );
};
