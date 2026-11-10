import type * as React from 'react';
import { Link } from 'wouter';

/** Crosshair mark from the design-system header. */
const BrandIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden>
    <path d="M 16 4 V 28 M 4 16 H 28" stroke="var(--color-accent)" strokeWidth="1.5" fill="none" />
    <rect
      x="10"
      y="10"
      width="12"
      height="12"
      fill="var(--color-surface)"
      stroke="var(--color-accent)"
      strokeWidth="2"
    />
    <circle cx="16" cy="16" r="3" fill="var(--color-accent)" />
  </svg>
);

type BrandMarkProps = {
  /** Small cyan chip next to ARCHLENS (e.g. CANVAS, TRACELENS, DOCS). */
  badge?: string;
  /** One-line subtitle under the title. */
  subtitle?: string;
};

/**
 * Design-system product lockup: glowing icon + ARCHLENS title.
 * Links to the product guide (`/guide`).
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ badge, subtitle }) => (
  <Link href="/guide" className="flex items-center gap-3 min-w-0 group">
    <div className="p-1 border border-accent/40 rounded bg-accent/10 shrink-0 group-hover:border-accent/70 transition-colors">
      <BrandIcon />
    </div>
    <div className="min-w-0 hidden sm:block">
      <div className="text-xl md:text-2xl font-extrabold tracking-tight text-ink flex items-center gap-2 leading-none">
        <span>ARCHLENS</span>
        {badge ? (
          <span className="text-accent font-mono text-sm border border-accent/30 px-2 py-0.5 rounded bg-cyan-950/30">
            {badge}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="text-xs text-slate-400 font-medium font-sans mt-1 truncate">{subtitle}</p>
      ) : null}
    </div>
    <span className="sr-only sm:hidden">ARCHLENS{badge ? ` ${badge}` : ''}</span>
  </Link>
);
