/** Shared outcome copy — lead with why teams care, not feature lists. */

export const PRODUCT_HERO = {
  headline: 'Catch architecture risk before it becomes an outage',
  lede: 'Model failures on your diagram, surface code hotspots, and get a ranked fix list — while design is still cheap to change.',
  trustLine:
    'Free, open source, and local-first. Diagrams stay in your browser or folders you open — no account, no uploads to ArchLens servers.',
} as const;

export const WHY_IT_MATTERS = [
  {
    title: 'Simulate without touching production',
    body: 'ChaosLens faults your BlueprintSpec in the browser — see blast radius and SLA impact in seconds, with no game-day breakage.',
  },
  {
    title: 'See fragile code on the diagram',
    body: 'TraceLens attaches churn, complexity, and coupling to the nodes you already maintain — hotspots visible where architects actually work.',
  },
  {
    title: 'Know what to fix first',
    body: 'AdviceLens merges simulation and forensics into one ranked, evidence-backed action list for review, RFCs, and CI.',
  },
] as const;

export const WORKSPACE_STARTUP = {
  title: 'See what breaks before your customers do',
  lede: 'Load the demo estate to simulate failures and ranked advice in minutes — or open blueprints from your own repo.',
} as const;

export const TRACE_LENS_HERO = {
  pageTitle: 'Estate forensics',
  offenders: {
    sectionTitle: 'Worst offenders',
    body: 'Estate-wide ranking by forensics signals — churn, complexity, and coupling on every loaded blueprint. Find nodes that amplify outage risk before you refactor.',
  },
  recommendations: {
    body: 'Headless ChaosLens scenarios across every loaded diagram, merged with TraceLens signals. Click a row for evidence and the next action.',
  },
} as const;
