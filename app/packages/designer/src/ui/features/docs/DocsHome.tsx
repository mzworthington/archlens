import React from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  FileCode2,
  GitBranch,
  Layers,
  Lightbulb,
  ScanSearch,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DocsShell } from './DocsShell';

type Product = {
  title: string;
  tagline: string;
  details: string;
  href: string;
  category: 'Platform' | 'Intelligence' | 'Resilience' | 'Contract';
  icon: LucideIcon;
  featured?: boolean;
  foundational?: boolean;
  role?: 'Observes' | 'Prescribes';
};

const FLOW = [
  {
    step: '1',
    title: 'Generate from code',
    body: 'ArchLens scans your repo and writes validated architecture YAML.',
  },
  {
    step: '2',
    title: 'Design in the canvas',
    body: 'ArchLens Canvas runs in your browser - edit diagrams locally with bi-directional YAML sync and no uploads to ArchLens servers.',
  },
  {
    step: '3',
    title: 'Validate before you ship',
    body: 'TraceLens, ChaosLens, and AdviceLens surface risk, resilience gaps, and ranked fixes while architecture is still cheap to change.',
  },
] as const;

const PRODUCTS: Product[] = [
  {
    title: 'ArchLens Canvas',
    tagline: 'Visual architecture studio',
    details:
      'Local-first C4 workspace with bi-directional YAML sync - the place teams refine and govern the live diagram.',
    href: '/guide/canvas',
    category: 'Platform',
    icon: Layers,
    featured: true,
  },
  {
    title: 'ArchLens',
    tagline: 'Code to architecture',
    details:
      'Static analysis that discovers systems, containers, and dependencies - keeping blueprints aligned with production.',
    href: '/guide/cli',
    category: 'Platform',
    icon: Terminal,
    featured: true,
  },
  {
    title: 'TraceLens',
    tagline: 'Operational intelligence',
    details:
      'Git churn, complexity, and coupling on every node - highlight hotspots and refactoring boundaries early.',
    href: '/guide/tracelens',
    category: 'Intelligence',
    role: 'Observes',
    icon: GitBranch,
  },
  {
    title: 'ChaosLens',
    tagline: 'Resilience simulation',
    details:
      'Model faults on the live diagram, see blast radius and SLA impact, and catch single points of failure in review.',
    href: '/guide/chaoslens',
    category: 'Resilience',
    icon: ShieldAlert,
  },
  {
    title: 'AdviceLens',
    tagline: 'Ranked architectural advice',
    details:
      'Merge TraceLens and ChaosLens signals into evidence-backed recommendations—studio, CLI, and CI.',
    href: '/guide/advicelens',
    category: 'Intelligence',
    role: 'Prescribes',
    icon: Lightbulb,
  },
  {
    title: 'BlueprintSpec',
    tagline: 'Shared architecture contract',
    details:
      'Declarative YAML schema and entity references your CLI, canvas, and CI pipelines can validate against.',
    href: '/guide/schema',
    category: 'Contract',
    icon: FileCode2,
    foundational: true,
  },
];

const CATEGORY_STYLES: Record<Product['category'], string> = {
  Platform: 'text-sky-300 border-sky-500/20 bg-sky-500/10',
  Intelligence: 'text-violet-300 border-violet-500/20 bg-violet-500/10',
  Resilience: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
  Contract: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
};

const ROLE_STYLES: Record<NonNullable<Product['role']>, string> = {
  Observes: 'text-violet-300 border-violet-500/20 bg-violet-500/10',
  Prescribes: 'text-rose-300 border-rose-500/20 bg-rose-500/10',
};

function productBadge(product: Product): { label: string; className: string } {
  if (product.role) {
    return { label: product.role, className: ROLE_STYLES[product.role] };
  }
  return { label: product.category, className: CATEGORY_STYLES[product.category] };
}

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  const badge = productBadge(product);

  if (product.foundational) {
    return (
      <Link
        href={product.href}
        aria-label={`${product.title}: ${product.tagline}`}
        className="group flex flex-col gap-4 rounded-xl border border-emerald-400/25 bg-[#040914]/80 p-5 transition-all hover:border-emerald-400/40 hover:bg-[#061125]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:flex-row sm:items-center"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
              {product.title}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-300">{product.tagline}</p>
          <p className="mt-1 text-sm text-slate-400 leading-relaxed">{product.details}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-300 group-hover:gap-2 transition-all sm:self-center">
          Learn more
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={product.href}
      aria-label={`${product.title}: ${product.tagline}`}
      className={`group flex flex-col rounded-xl border bg-[#040914]/80 p-5 transition-all hover:border-[#00f0ff]/35 hover:bg-[#061125]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/50 ${
        product.featured ? 'border-[#00f0ff]/25 sm:col-span-1' : 'border-[#00f0ff]/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#00f0ff]/15 bg-[#00f0ff]/5 text-[#00f0ff]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-white group-hover:text-[#00f0ff] transition-colors">
        {product.title}
      </h3>
      <p className="mt-1 text-xs font-medium text-slate-300">{product.tagline}</p>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed flex-1">{product.details}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#00f0ff] group-hover:gap-2 transition-all">
        Learn more
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Link>
  );
}

export const DocsHome: React.FC = () => {
  const featured = PRODUCTS.filter(p => p.featured);
  const foundational = PRODUCTS.find(p => p.foundational);
  const suite = PRODUCTS.filter(p => !p.featured && !p.foundational);

  return (
    <DocsShell layout="landing">
      <div data-testid="docs-home" className="space-y-14">
        <section className="relative overflow-hidden rounded-2xl border border-[#00f0ff]/10 bg-[#061125]/50 p-6 sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,240,255,0.12),transparent)]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff]">
                  ArchLens
                </p>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                  Free & open source
                </span>
                <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-sky-300">
                  Local-first
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
                Architecture your teams can design, validate, and trust
              </h1>
              <p className="mt-4 max-w-xl text-slate-400 text-base sm:text-lg leading-relaxed">
                Free to use with no license fees. ArchLens Canvas runs in your browser - diagrams
                stay in IndexedDB or folders you open, with no account and no uploads to ArchLens
                servers.
              </p>
              <p className="mt-3 max-w-xl text-slate-500 text-sm leading-relaxed">
                One product suite from codebase to diagram: declarative specs, operational insight,
                and resilience simulation before incidents reach customers.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00f0ff]/90 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#00f0ff] transition-colors"
                >
                  Open ArchLens Canvas
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/journeys"
                  className="inline-flex items-center justify-center rounded-xl border border-[#00f0ff]/40 px-5 py-3 text-sm font-semibold text-[#00f0ff] hover:text-white hover:bg-[#00f0ff]/10 hover:border-[#00f0ff] transition-colors"
                >
                  5-minute journey
                </Link>
                <Link
                  href="/guide/getting-started"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors"
                >
                  Install & get started
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                New to ArchLens?{' '}
                <Link
                  href="/guide"
                  className="text-slate-300 hover:text-[#00f0ff] transition-colors"
                >
                  Read the full product guide
                </Link>
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <img
                src="/assets/logo.svg"
                alt=""
                role="presentation"
                className="w-40 sm:w-48 lg:w-56 drop-shadow-[0_0_40px_rgba(0,240,255,0.25)]"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="how-it-works-heading">
          <h2
            id="how-it-works-heading"
            className="text-xs font-mono uppercase tracking-[0.16em] text-slate-500 mb-5"
          >
            How teams use ArchLens
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {FLOW.map(item => (
              <li
                key={item.step}
                className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/60 p-5"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 font-mono text-xs font-bold text-[#00f0ff]">
                  {item.step}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="products-heading">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
            <div>
              <h2
                id="products-heading"
                className="text-xs font-mono uppercase tracking-[0.16em] text-slate-500"
              >
                Product suite
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Platform, intelligence, resilience, and contract - composed around BlueprintSpec.
              </p>
            </div>
            <Link
              href="/guide"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00f0ff] hover:text-white transition-colors shrink-0"
            >
              Compare in the guide
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map(product => (
              <ProductCard key={product.title} product={product} />
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suite.map(product => (
              <ProductCard key={product.title} product={product} />
            ))}
          </div>
          {foundational && (
            <div className="mt-4">
              <ProductCard product={foundational} />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#00f0ff]/15 bg-gradient-to-br from-[#00f0ff]/10 via-transparent to-transparent p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#00f0ff]/20 bg-[#00f0ff]/10 text-[#00f0ff]">
              <ScanSearch className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Ready to explore?</h2>
              <p className="mt-1 text-sm text-slate-400 max-w-md">
                No sign-up required - load the sandbox in ArchLens Canvas for free, or follow the
                getting-started walkthrough with your own repository.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/workspace"
              className="inline-flex items-center justify-center rounded-xl bg-[#00f0ff]/90 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#00f0ff] transition-colors"
            >
              Open canvas
            </Link>
            <Link
              href="/guide/getting-started"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors"
            >
              Getting started
            </Link>
          </div>
        </section>
      </div>
    </DocsShell>
  );
};
