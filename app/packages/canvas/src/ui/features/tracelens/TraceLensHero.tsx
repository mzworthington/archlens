import { TRACE_LENS_HERO } from '../../content/productOutcomes';
import type { TraceLensView } from './useTraceLensPanelModel';

export function TraceLensHero({
  traceLensView,
  lookback,
}: {
  traceLensView: TraceLensView;
  lookback: number | null | undefined;
}) {
  const body =
    traceLensView === 'recommendations'
      ? TRACE_LENS_HERO.recommendations.body
      : lookback != null
        ? `${TRACE_LENS_HERO.offenders.body} Lookback ${lookback}d.`
        : TRACE_LENS_HERO.offenders.body;

  return (
    <section className="relative overflow-hidden mb-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,240,255,0.08),transparent)]" />
      <div className="relative">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-[1.1]">
          {TRACE_LENS_HERO.pageTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-400 text-sm leading-relaxed">{body}</p>
      </div>
    </section>
  );
}
