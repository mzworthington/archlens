/** Shared outcome copy. Product names first. BlueprintSpec is the architecture contract, not a YAML pitch. */

export const PRODUCT_HERO = {
  headline: 'Catch architecture risk before it becomes an outage',
  documentTitle: 'ArchLens - Catch architecture risk before it becomes an outage',
  lede: 'Canvas is the map you work on. The CLI builds it from the repo. TraceLens and ChaosLens run on it, and AdviceLens ranks what to change.',
  trustLine:
    'Open source. No account. Drafts stay in the browser or the folder you open. Nothing is uploaded to ArchLens servers unless you publish a catalog from CI.',
} as const;

export const WHY_IT_MATTERS = [
  {
    title: 'ChaosLens',
    body: 'Fault a service on the map you already have open. See the blast radius in the browser. Production stays up.',
  },
  {
    title: 'TraceLens',
    body: 'Git hotspots sit on the same nodes. Fragile files are on the map, not a separate dashboard.',
  },
  {
    title: 'AdviceLens',
    body: 'A ranked list of what to change, from TraceLens and ChaosLens. Same list in Canvas, the CLI and CI.',
  },
] as const;

export const WORKSPACE_STARTUP = {
  title: 'What do you want to do?',
  lede: 'Pick an intent: Investigate, Collaborate or Ideate. You can switch later from Open. New here? Try the demo first.',
} as const;

export const TRACE_LENS_HERO = {
  pageTitle: 'Forensics',
  offenders: {
    sectionTitle: 'Worst offenders',
    body: 'Estate-wide ranking by git metrics, temporal coupling and blueprint dependency hotspots on every loaded diagram. Find nodes that amplify outage risk before you refactor.',
  },
  recommendations: {
    body: 'Headless ChaosLens scenarios across every loaded diagram, merged with TraceLens git and connection signals. Click a row for evidence and the next action.',
  },
} as const;
