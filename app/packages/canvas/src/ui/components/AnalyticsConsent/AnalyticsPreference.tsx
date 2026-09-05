import { useAnalyticsConsent } from './analyticsConsentContext';

export function AnalyticsPreference() {
  const analytics = useAnalyticsConsent();
  if (!analytics || analytics.consent === 'unset') {
    return null;
  }

  const helping = analytics.consent === 'granted';

  return (
    <section
      aria-labelledby="analytics-preference-heading"
      data-testid="analytics-preference"
      className="mb-8 rounded-xl border border-[#00f0ff]/20 bg-slate-950/60 p-4"
    >
      <h2 id="analytics-preference-heading" className="text-sm font-semibold text-white">
        Product analytics
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        {helping
          ? 'You opted in. We use a PostHog cookie so we can tell visits apart and improve the product.'
          : 'You asked not to be tracked. PostHog stays off in this browser until you opt in.'}
      </p>
      <button
        type="button"
        onClick={helping ? analytics.deny : analytics.grant}
        className="mt-3 rounded-md border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-3 py-1.5 text-xs font-semibold text-[#00f0ff] hover:bg-[#00f0ff]/20"
      >
        {helping ? 'Stop tracking' : 'Help improve ArchLens'}
      </button>
    </section>
  );
}
