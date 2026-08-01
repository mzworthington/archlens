import { TRACE_LENS_HERO } from '../../content/productOutcomes';
import type { TraceLensView } from './useTraceLensPanelModel';

export function TraceLensHero({
  traceLensView,
  lookback,
}: {
  traceLensView: TraceLensView;
  lookback: number | null | undefined;
}) {
  return (
    <section className="relative overflow-hidden mb-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,240,255,0.08),transparent)]" />
      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-2">
          {traceLensView === 'recommendations' ? 'Estate scan' : 'Risk ranking'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-[1.1]">
          {traceLensView === 'recommendations'
            ? TRACE_LENS_HERO.recommendations.title
            : TRACE_LENS_HERO.offenders.title}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-400 text-sm leading-relaxed">
          {traceLensView === 'recommendations'
            ? TRACE_LENS_HERO.recommendations.body
            : lookback != null
              ? `${TRACE_LENS_HERO.offenders.body} Lookback ${lookback}d.`
              : TRACE_LENS_HERO.offenders.body}
        </p>
      </div>
    </section>
  );
}
