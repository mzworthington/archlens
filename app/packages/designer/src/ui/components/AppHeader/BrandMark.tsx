import React from 'react';
import { Link } from 'wouter';

/** Crosshair mark from the design-system header. */
export const BrandIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden>
    <path d="M 16 4 V 28 M 4 16 H 28" stroke="#00f0ff" strokeWidth="1.5" fill="none" />
    <rect x="10" y="10" width="12" height="12" fill="#061125" stroke="#00f0ff" strokeWidth="2" />
    <circle cx="16" cy="16" r="3" fill="#00f0ff" />
  </svg>
);

export type BrandLensTab = {
  label: string;
  href: string;
  active: boolean;
};

type BrandMarkProps = {
  /** Small cyan chip next to ARCHLENS (e.g. CANVAS, CHAOSLENS, DOCS). */
  badge?: string;
  /** Forensics lens switcher shown instead of a single badge. */
  lensTabs?: BrandLensTab[];
  /** One-line subtitle under the title. */
  subtitle?: string;
};

const badgeClass =
  'text-[#00f0ff] font-mono text-sm border border-[#00f0ff]/30 px-2 py-0.5 rounded bg-cyan-950/30';

function LensTabChips({ tabs }: { tabs: BrandLensTab[] }) {
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label="Forensics lenses">
      {tabs.map(tab => (
        <Link
          key={tab.label}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={`${badgeClass} transition-colors ${
            tab.active
              ? 'bg-[#00f0ff]/15 border-[#00f0ff]/50'
              : 'text-slate-400 border-[#00f0ff]/20 hover:text-[#00f0ff] hover:border-[#00f0ff]/40'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </span>
  );
}

/**
 * Design-system product lockup: glowing icon + ARCHLENS title.
 * Icon and title link home (`/`); lens tabs are separate links when present.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ badge, lensTabs, subtitle }) => {
  const activeLens = lensTabs?.find(tab => tab.active)?.label;
  const contextLabel = lensTabs?.length ? activeLens : badge;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Link href="/" className="shrink-0 group">
        <div className="p-1 border border-[#00f0ff]/40 rounded bg-cyan-950/20 shadow-[0_0_8px_rgba(0,240,255,0.2)] group-hover:border-[#00f0ff]/70 transition-colors">
          <BrandIcon />
        </div>
      </Link>
      <div className="min-w-0 hidden sm:block">
        <div className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2 leading-none">
          <Link href="/" className="hover:text-[#00f0ff] transition-colors">
            ARCHLENS
          </Link>
          {lensTabs?.length ? <LensTabChips tabs={lensTabs} /> : null}
          {badge ? <span className={badgeClass}>{badge}</span> : null}
        </div>
        {subtitle ? (
          <p className="text-xs text-slate-400 font-medium font-sans mt-1 truncate">{subtitle}</p>
        ) : null}
      </div>
      <span className="sr-only sm:hidden">ARCHLENS{contextLabel ? ` ${contextLabel}` : ''}</span>
    </div>
  );
};
