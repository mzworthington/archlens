import React from 'react';
import { Link } from 'wouter';
import { DocsShell } from './DocsShell';
import { GoldenJourneyTour } from './GoldenJourneyTour';

export const JourneysPage: React.FC = () => {
  return (
    <DocsShell title="Interface tour & journeys">
      <div data-testid="journeys-page" className="space-y-12">
        <header>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Interface tour & journeys</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 leading-relaxed">
            Product demos live on each guide chapter. Start with the golden day-in-the-life journey
            below, then explore individual lenses.
          </p>
        </header>

        <GoldenJourneyTour />

        <section
          aria-labelledby="other-demos-heading"
          className="border-t border-[#00f0ff]/10 pt-10"
        >
          <h2
            id="other-demos-heading"
            className="text-xs font-mono uppercase tracking-[0.16em] text-slate-500"
          >
            Other product demos
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Canvas tour', href: '/guide/canvas', img: 'canvas-tour.gif' },
              { label: 'CLI prompts', href: '/guide/cli', img: 'cli.gif' },
              { label: 'TraceLens', href: '/guide/tracelens', img: 'tracelens.gif' },
              { label: 'ChaosLens', href: '/guide/chaoslens', img: 'chaoslens.gif' },
            ].map(demo => (
              <li key={demo.href}>
                <Link
                  href={demo.href}
                  className="group flex items-center gap-3 rounded-lg border border-[#00f0ff]/10 bg-[#040914]/60 p-3 transition-colors hover:border-[#00f0ff]/30"
                >
                  <img
                    src={`/docs-assets/screenshots/${demo.img}`}
                    alt=""
                    className="h-12 w-20 rounded object-cover opacity-80 group-hover:opacity-100"
                  />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-[#00f0ff]">
                    {demo.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="text-sm text-slate-500">
          <p>
            Refresh GIFs locally:{' '}
            <code className="text-slate-400">mise install && cd app && pnpm record:docs-media</code>
            . See{' '}
            <Link href="/setup" className="text-[#00f0ff] hover:text-white">
              Setup
            </Link>{' '}
            for ffmpeg, vhs and E2E details.
          </p>
        </section>
      </div>
    </DocsShell>
  );
};
