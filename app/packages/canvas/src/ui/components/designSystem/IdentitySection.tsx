import React from 'react';
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import type { DesignSystemSectionId } from '../designSystemSections';

const IDENTITY_GUIDELINES = [
  {
    title: 'Drafting grid',
    details:
      'Heavy structural blueprints need a base grid. Major guidelines at 100px; micro subdivisions at 20px.',
  },
  {
    title: 'Electric cyan glow',
    details:
      'Active links, endpoints and databases emit neon cyan glow (filter blur) to show operational flow.',
  },
  {
    title: 'Monochrome contrast',
    details: 'Layouts rest on deep navy (#040914) with typography in stark white or soft gray.',
  },
  {
    title: 'Product naming',
    details:
      'Customer-facing copy uses official names: ArchLens Canvas, ArchLens CLI, TraceLens, ChaosLens, AdviceLens, BlueprintSpec and ChaosSpec.',
  },
];

type IdentitySectionProps = {
  embedded: boolean;
  setActiveTab: (tab: DesignSystemSectionId) => void;
};

export const IdentitySection: React.FC<IdentitySectionProps> = ({ embedded, setActiveTab }) => (
  <div className="animate-fade-in">
    {embedded ? (
      <section className="mb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white tracking-tight">Schematic by design</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 leading-relaxed">
              Drafting grids, cyan accents and product-centric patterns for homepage, docs and
              canvas.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('components')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00f0ff]/90 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-[#00f0ff] transition-colors cursor-pointer"
              >
                UI patterns
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tokens')}
                className="rounded-lg border border-[#00f0ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/10 px-3 py-2 text-sm font-semibold transition-colors cursor-pointer"
              >
                Design tokens
              </button>
              <Link
                href="/"
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
              >
                Product homepage
              </Link>
            </div>
          </div>
          <img
            src="/assets/logo.svg"
            alt="ArchLens logo"
            className="w-20 sm:w-24 shrink-0 drop-shadow-[0_0_30px_rgba(0,240,255,0.2)]"
          />
        </div>
      </section>
    ) : (
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,240,255,0.10),transparent)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-3">
              ArchLens design system
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
              Schematic by design
            </h2>
            <p className="mt-4 max-w-xl text-slate-400 text-base sm:text-lg leading-relaxed">
              Shared visual language for the homepage, docs and canvas: drafting grids, cyan accents
              and product-centric marketing patterns.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('components')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00f0ff]/90 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#00f0ff] transition-colors"
              >
                UI patterns
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tokens')}
                className="rounded-xl border border-[#00f0ff]/40 text-[#00f0ff] hover:text-white hover:bg-[#00f0ff]/10 hover:border-[#00f0ff] px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                Design tokens
              </button>
              <Link
                href="/"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
              >
                Product homepage
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src="/assets/logo.svg"
              alt="ArchLens logo"
              className="w-48 sm:w-56 drop-shadow-[0_0_40px_rgba(0,240,255,0.25)]"
            />
          </div>
        </div>
      </section>
    )}

    <div
      className={
        embedded ? 'grid gap-4 sm:grid-cols-2' : 'mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
      }
    >
      {IDENTITY_GUIDELINES.map(guideline => (
        <article
          key={guideline.title}
          className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/80 p-5"
        >
          <h3 className="text-base font-semibold text-white">{guideline.title}</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">{guideline.details}</p>
        </article>
      ))}
    </div>
  </div>
);
