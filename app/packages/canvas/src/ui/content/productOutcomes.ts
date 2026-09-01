/** Shared outcome copy - lead with why teams care, not feature lists. */

export const PRODUCT_HERO = {
  headline: 'Catch architecture risk before it becomes an outage',
  lede: 'Model failures on your diagram, surface code hotspots, and get a ranked fix list - while design is still cheap to change.',
  trustLine:
    'Free and open source. Author locally in your browser or folders you open - no account, no uploads to ArchLens servers. Publish BlueprintSpec from CI when the team needs a shared, living estate view.',
} as const;

export const WHY_IT_MATTERS = [
  {
    title: 'Simulate without touching production',
    body: 'ChaosLens faults your BlueprintSpec in the browser - see blast radius and SLA impact in seconds, with no game-day breakage.',
  },
  {
    title: 'See fragile code on the diagram',
    body: 'TraceLens attaches git churn, complexity, and schema dependencies to the nodes you already maintain - hotspots and connection risk visible where architects actually work.',
  },
  {
    title: 'Know what to fix first',
    body: 'AdviceLens merges simulation and forensics into one ranked, evidence-backed action list for review, RFCs, and CI.',
  },
] as const;

export const WORKSPACE_STARTUP = {
  title: 'What do you want to do?',
  lede: 'Pick an intent - Investigate, Collaborate, or Ideate. You can switch later from Open. New here? Try the demo at the bottom.',
} as const;

export const TRACE_LENS_HERO = {
  pageTitle: 'Forensics',
  offenders: {
    sectionTitle: 'Worst offenders',
    body: 'Estate-wide ranking by git metrics, temporal coupling, and blueprint dependency hotspots on every loaded diagram. Find nodes that amplify outage risk before you refactor.',
  },
  recommendations: {
    body: 'Headless ChaosLens scenarios across every loaded diagram, merged with TraceLens git and connection signals. Click a row for evidence and the next action.',
  },
} as const;
