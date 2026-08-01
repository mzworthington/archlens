import React from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  ClipboardCopy,
  Download,
  Lightbulb,
  ScanSearch,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CHECKOUT_API_REF = 'golden-paths/golden-journey/checkout-platform/checkout-api';
const WORKSPACE_ESTATE = '/workspace/golden-paths/golden-journey';
const WORKSPACE_RESILIENCE = `${WORKSPACE_ESTATE}?resilience=1`;
const ADVICE_URL = '/tracelens?view=recommendations';
const REFACTOR_PLAN_URL = `/tracelens?view=recommendations&plan=${encodeURIComponent(
  CHECKOUT_API_REF
)}`;

const ESTATE_PRODUCTS = [
  {
    name: 'Catalog Platform',
    role: 'Discovery',
    detail: 'Browse and add-to-cart — hands off to Checkout API inside the estate context.',
  },
  {
    name: 'Identity Platform',
    role: 'Access',
    detail:
      'SSO session handoff into checkout — another product boundary in the same context window.',
  },
  {
    name: 'Checkout Platform',
    role: 'Golden path',
    detail:
      'Group boundary for Web/Mobile entry — fault Payment Gateway here for AdviceLens ranking.',
  },
  {
    name: 'Billing Platform',
    role: 'Renewals',
    detail:
      'Shares Payment Gateway with checkout — fan-in drives caller-side circuit breaker advice.',
  },
] as const;

type JourneyStep = {
  step: number;
  title: string;
  product: string;
  body: string;
  icon: LucideIcon;
  tryHref?: string;
  tryLabel?: string;
  cli?: string;
};

const STEPS: JourneyStep[] = [
  {
    step: 1,
    title: 'Scan the repository',
    product: 'ArchLens CLI',
    body: 'Run ArchLens against your codebase to emit BlueprintSpec YAML for every product area. The bundled golden-journey estate mirrors what a monorepo scan produces — catalog, identity, checkout, and billing groups in one context window, sharing a Payment Gateway.',
    icon: Terminal,
    cli: 'archlens scan ./src --output ./blueprints\narchlens resilience ./blueprints/golden-journey --chaos-specs=./chaos-specs',
    tryLabel: 'CLI guide',
    tryHref: '/guide/cli',
  },
  {
    step: 2,
    title: 'Open the estate context',
    product: 'ArchLens Canvas',
    body: 'Load Golden Paths to open the Golden Journey estate — personas, storefronts, catalog, identity, checkout, and billing platforms around a shared Payment Gateway. Switch to the Golden Paths context breadcrumb anytime to see persona-only context view.',
    icon: ScanSearch,
    tryHref: WORKSPACE_ESTATE,
    tryLabel: 'Open Golden Journey estate',
  },
  {
    step: 3,
    title: 'Simulate Payment Gateway outage',
    product: 'ChaosLens',
    body: 'Toggle Resilience, select Payment Gateway, add a region-outage fault, and run Simulate. Blast radius crosses group boundaries — from the shared gateway through Checkout Platform to Web and Mobile entry points.',
    icon: ShieldAlert,
    tryHref: WORKSPACE_RESILIENCE,
    tryLabel: 'Open in Resilience mode',
  },
  {
    step: 4,
    title: 'See AdviceLens rank the fix',
    product: 'AdviceLens',
    body: 'The telemetry panel lists ranked recommendations. add-circuit-breaker on Checkout API should top the list — caller-side isolation on the outbound Payment Gateway client, backed by shared-dependency fan-in across product groups.',
    icon: Lightbulb,
    tryHref: ADVICE_URL,
    tryLabel: 'Open estate recommendations',
  },
  {
    step: 5,
    title: 'Open the refactor plan',
    product: 'TraceLens',
    body: 'Click the Checkout API recommendation to open the refactor slide-over. Drill into the Payment Client component inside Checkout Platform for code-level hotspot evidence that rolls up to the container recommendation.',
    icon: ClipboardCopy,
    tryHref: REFACTOR_PLAN_URL,
    tryLabel: 'Open refactor plan',
  },
  {
    step: 6,
    title: 'Export evidence for your RFC',
    product: 'ChaosSpec',
    body: 'From the workspace menu (or resilience panel), Export ChaosSpec to capture the Payment Gateway outage across the estate. Paste the shareable workspace URL and exported spec into your architecture RFC or game-day deck.',
    icon: Download,
    tryHref: WORKSPACE_RESILIENCE,
    tryLabel: 'Export from workspace',
  },
];

function StepCard({ step }: { step: JourneyStep }) {
  const Icon = step.icon;

  return (
    <li
      className="rounded-xl border border-[#00f0ff]/12 bg-[#040914]/70 p-5 sm:p-6"
      data-testid={`journey-step-${step.step}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:w-14 shrink-0">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10 font-mono text-sm font-bold text-[#00f0ff]"
            aria-hidden
          >
            {step.step}
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#00f0ff]/15 bg-[#00f0ff]/5 text-[#00f0ff] sm:mt-1">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">{step.title}</h3>
            <span className="rounded-full border border-slate-600/40 bg-slate-800/50 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {step.product}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">{step.body}</p>
          {step.cli ? (
            <pre
              className="mt-3 overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-950/80 p-3 font-mono text-xs text-slate-300"
              data-testid={`journey-step-${step.step}-cli`}
            >
              {step.cli}
            </pre>
          ) : null}
          {step.tryHref && step.tryLabel ? (
            <Link
              href={step.tryHref}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#00f0ff] hover:text-white transition-colors"
              data-testid={`journey-step-${step.step}-cta`}
            >
              {step.tryLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export const GoldenJourneyTour: React.FC = () => {
  return (
    <section aria-labelledby="golden-journey-heading" data-testid="golden-journey-tour">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff]">
          ~5 minutes
        </p>
        <h2 id="golden-journey-heading" className="mt-1 text-2xl font-bold text-white">
          Day in the life: Payment Gateway outage
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400 leading-relaxed">
          One estate context window — catalog, identity, checkout, and billing product groups
          sharing a Payment Gateway — then ChaosLens simulation, AdviceLens ranking, TraceLens
          refactor evidence, and ChaosSpec export for your RFC.
        </p>
      </div>

      <div
        className="mb-8 rounded-xl border border-[#00f0ff]/10 bg-[#061125]/40 p-4 sm:p-5"
        data-testid="golden-journey-estate-map"
      >
        <h3 className="text-xs font-mono uppercase tracking-[0.14em] text-slate-500">
          Estate context — related products
        </h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {ESTATE_PRODUCTS.map(product => (
            <li
              key={product.name}
              className="rounded-lg border border-[#00f0ff]/10 bg-[#040914]/60 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-slate-200">{product.name}</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#00f0ff]/80">
                {product.role}
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{product.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-8 overflow-hidden rounded-xl border border-[#00f0ff]/10 bg-[#061125]/40">
        <img
          src="/docs-assets/screenshots/golden-journey.gif"
          alt="Golden journey estate: Payment Gateway outage across product group boundaries"
          className="w-full"
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      <ol className="space-y-4">
        {STEPS.map(step => (
          <StepCard key={step.step} step={step} />
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-950/50 p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300">ChaosSpec for this scenario</p>
        <p className="mt-1">
          Pre-authored spec:{' '}
          <code className="text-slate-300">
            chaos-specs/golden-journey-payment-gateway-outage.yaml
          </code>
          — targets the full estate diagram{' '}
          <code className="text-slate-300">golden-paths/golden-journey</code>. Import from the
          workspace menu in Resilience mode or pass{' '}
          <code className="text-slate-300">--chaos-specs=./chaos-specs</code> to the CLI estate
          sweep.
        </p>
      </div>
    </section>
  );
};
