import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AppHeader } from '../../components/AppHeader';
import { DOCS_NAV, DOCS_SIDEBAR, docsSidebarSectionForPath, isDocsNavActive } from './pages';

export type DocsLocalNav = {
  /** Section label for mobile scroller (e.g. "On this page"). */
  title: string;
  /** Docs path whose sidebar item expands to show these entries. */
  expandUnderPath: string;
  items: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
};

type Props = {
  children: React.ReactNode;
  title?: string;
  /** Landing drops the docs sidebar and mobile chapter nav for the product homepage. */
  layout?: 'docs' | 'landing';
  /** Flush main content without the inner card (full-width interactive pages). */
  contentLayout?: 'card' | 'flush';
  /** In-page section nav - nested under a sidebar link on desktop, scroller on mobile. */
  localNav?: DocsLocalNav;
};

const chipClass = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-[11px] font-mono whitespace-nowrap transition-all border shrink-0 ${
    active
      ? 'bg-accent/15 text-accent border-accent/30'
      : 'text-ink/55 hover:text-ink/90 bg-transparent border-transparent hover:bg-white/5'
  }`;

function MobileScroller({
  items,
  location,
  'aria-label': ariaLabel,
  testId,
}: {
  items: { label: string; path: string }[];
  location: string;
  'aria-label': string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex gap-2 items-center px-3 pb-3 overflow-x-auto scrollbar-none min-w-0"
      role="navigation"
      aria-label={ariaLabel}
    >
      {items.map(item => {
        const active = location === item.path;
        return (
          <Link key={item.path} href={item.path} className={chipClass(active)}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function MobileLocalNav({ localNav }: { localNav: DocsLocalNav }) {
  return (
    <div className="border-t border-accent/10">
      <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
        {localNav.title}
      </p>
      <div
        data-testid="docs-mobile-local-nav"
        className="flex gap-2 items-center p-3 overflow-x-auto scrollbar-none min-w-0"
        role="navigation"
        aria-label={localNav.title}
      >
        {localNav.items.map(item => {
          const active = localNav.activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => localNav.onSelect(item.id)}
              className={`${chipClass(active)} cursor-pointer`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Mobile chapter nav: one section-tab row + one link scroller for the active section.
 * Avoids stacking every Start/Learn/Surfaces/Tech scroller and eating the viewport.
 */
function MobileDocsChapterNav({
  location,
  showLocalNav,
  localNav,
}: {
  location: string;
  showLocalNav: boolean;
  localNav?: DocsLocalNav;
}) {
  const locationSectionTitle = docsSidebarSectionForPath(location).title;
  const [activeSectionTitle, setActiveSectionTitle] = useState(locationSectionTitle);

  useEffect(() => {
    setActiveSectionTitle(locationSectionTitle);
  }, [locationSectionTitle]);

  const activeSection =
    DOCS_SIDEBAR.find(section => section.title === activeSectionTitle) ?? DOCS_SIDEBAR[0]!;
  const sectionSlug = activeSection.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div
      className="lg:hidden border-b border-accent/10 bg-surface/60 backdrop-blur-sm sticky top-[73px] z-40"
      data-testid="docs-mobile-chapter-nav"
    >
      <div
        className="flex gap-2 items-center px-3 pt-2.5 pb-1.5 overflow-x-auto scrollbar-none min-w-0"
        role="tablist"
        aria-label="Docs chapters"
        data-testid="docs-mobile-section-tabs"
      >
        {DOCS_SIDEBAR.map(section => {
          const selected = section.title === activeSection.title;
          return (
            <button
              key={section.title}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`${chipClass(selected)} cursor-pointer uppercase tracking-[0.12em]`}
              onClick={() => setActiveSectionTitle(section.title)}
            >
              {section.title}
            </button>
          );
        })}
      </div>
      <MobileScroller
        items={activeSection.items}
        location={location}
        aria-label={activeSection.title}
        testId={`docs-mobile-${sectionSlug}-nav`}
      />
      {showLocalNav && localNav ? <MobileLocalNav localNav={localNav} /> : null}
    </div>
  );
}

export const DocsShell: React.FC<Props> = ({
  children,
  title,
  layout = 'docs',
  contentLayout = 'card',
  localNav,
}) => {
  const [location] = useLocation();
  const isLanding = layout === 'landing';
  const showLocalNav = Boolean(localNav && location === localNav.expandUnderPath);

  return (
    <div className="h-dvh w-full overflow-y-auto blueprint-grid text-ink pb-safe">
      <AppHeader
        sticky
        badge="DOCS"
        subtitle={
          isLanding ? 'Canvas, TraceLens and ChaosLens' : 'Product guide, technology and CI'
        }
      >
        {!isLanding ? (
          <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto border-l border-accent/15 pl-4">
            {DOCS_NAV.map(item => {
              const active = isDocsNavActive(location, item);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors shrink-0 ${
                    active
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'text-ink/55 hover:text-ink hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </AppHeader>

      {!isLanding ? (
        <MobileDocsChapterNav location={location} showLocalNav={showLocalNav} localNav={localNav} />
      ) : null}

      <div
        className={`mx-auto gap-8 px-4 py-8 sm:px-6 ${
          isLanding ? 'max-w-5xl' : 'grid max-w-6xl lg:grid-cols-[14rem_minmax(0,1fr)]'
        }`}
      >
        {!isLanding ? (
          <aside className="hidden lg:block" data-testid="docs-sidebar">
            <nav className="sticky top-28 space-y-6 text-sm" aria-label="Docs">
              {DOCS_SIDEBAR.map(section => (
                <div key={section.title}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                    {section.title}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map(item => {
                      const active = location === item.path;
                      const expandLocal = showLocalNav && item.path === localNav!.expandUnderPath;
                      return (
                        <li key={item.path}>
                          <Link
                            href={item.path}
                            className={`block rounded-md px-2 py-1.5 transition-colors ${
                              active
                                ? 'bg-accent/10 text-accent'
                                : 'text-ink/55 hover:text-ink hover:bg-white/5'
                            }`}
                          >
                            {item.label}
                          </Link>
                          {expandLocal ? (
                            <ul
                              className="mt-1 ml-2 space-y-0.5 border-l border-accent/15 pl-2"
                              aria-label={localNav!.title}
                            >
                              {localNav!.items.map(sub => {
                                const subActive = localNav!.activeId === sub.id;
                                return (
                                  <li key={sub.id}>
                                    <button
                                      type="button"
                                      onClick={() => localNav!.onSelect(sub.id)}
                                      className={`w-full text-left rounded-md px-2 py-1.5 text-[13px] transition-colors cursor-pointer ${
                                        subActive
                                          ? 'text-accent bg-accent/10'
                                          : 'text-ink/55 hover:text-ink hover:bg-white/5'
                                      }`}
                                    >
                                      {sub.label}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        ) : null}

        <main className={`min-w-0 ${isLanding ? '' : 'pb-16'}`}>
          {contentLayout === 'flush' ? (
            children
          ) : (
            <div
              className={
                isLanding
                  ? 'min-w-0'
                  : 'bg-surface/40 border border-accent/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm'
              }
            >
              {title ? (
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                  Docs
                </p>
              ) : null}
              {children}
            </div>
          )}
        </main>
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center font-mono text-[11px] tracking-wide text-ink/45">
          <nav aria-label="Legal">
            <Link href="/privacy" className="text-ink/55 transition-colors hover:text-accent">
              Privacy policy
            </Link>
          </nav>
          <p>
            Made by{' '}
            <a
              href="https://mzworthington.co.uk"
              className="text-ink/55 transition-colors hover:text-accent"
              rel="noopener noreferrer"
            >
              Matthew Z Worthington
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};
