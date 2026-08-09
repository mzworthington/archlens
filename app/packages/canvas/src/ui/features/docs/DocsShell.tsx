import React from 'react';
import { Link, useLocation } from 'wouter';
import { AppHeader } from '../../components/AppHeader';
import { DOCS_NAV, DOCS_SIDEBAR, isDocsNavActive } from './pages';

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
      className="flex gap-2 items-center p-3 overflow-x-auto scrollbar-none min-w-0"
      role="navigation"
      aria-label={ariaLabel}
    >
      {items.map(item => {
        const active = location === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-mono whitespace-nowrap transition-all border shrink-0 ${
              active
                ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/30'
                : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent hover:bg-white/5'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function MobileLocalNav({ localNav }: { localNav: DocsLocalNav }) {
  return (
    <div className="border-t border-[#00f0ff]/10">
      <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
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
              className={`rounded-lg px-3 py-1.5 text-[11px] font-mono whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/30'
                  : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
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
  const showLocalNav = localNav && location === localNav.expandUnderPath;

  return (
    <div className="h-dvh w-full overflow-y-auto blueprint-grid text-slate-100 pb-safe">
      <AppHeader
        sticky
        badge="DOCS"
        subtitle={
          isLanding
            ? 'Architecture products for engineering teams'
            : 'Product guide, technology, and CI'
        }
      >
        {!isLanding ? (
          <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto border-l border-[#00f0ff]/15 pl-4">
            {DOCS_NAV.map(item => {
              const active = isDocsNavActive(location, item);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors shrink-0 ${
                    active
                      ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
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
        <div className="lg:hidden border-b border-[#00f0ff]/10 bg-[#061125]/60 backdrop-blur-sm sticky top-[73px] z-40">
          {DOCS_SIDEBAR.map((section, index) => (
            <div
              key={section.title}
              className={index === 0 ? undefined : 'border-t border-[#00f0ff]/10'}
            >
              <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
                {section.title}
              </p>
              <MobileScroller
                items={section.items}
                location={location}
                aria-label={section.title}
                testId={`docs-mobile-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-nav`}
              />
            </div>
          ))}
          {showLocalNav ? <MobileLocalNav localNav={localNav!} /> : null}
        </div>
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
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
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
                                ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                            }`}
                          >
                            {item.label}
                          </Link>
                          {expandLocal ? (
                            <ul
                              className="mt-1 ml-2 space-y-0.5 border-l border-[#00f0ff]/15 pl-2"
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
                                          ? 'text-[#00f0ff] bg-[#00f0ff]/10'
                                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
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
                  : 'bg-[#061125]/40 border border-[#00f0ff]/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm'
              }
            >
              {title ? (
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
                  Docs
                </p>
              ) : null}
              {children}
            </div>
          )}
        </main>
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 sm:px-6">
        <p className="text-center font-mono text-[11px] tracking-wide text-slate-500">
          Made by{' '}
          <a
            href="https://mzworthington.co.uk"
            className="text-slate-400 transition-colors hover:text-[#00f0ff]"
            rel="noopener noreferrer"
          >
            Matthew Z Worthington
          </a>
        </p>
      </footer>
    </div>
  );
};
