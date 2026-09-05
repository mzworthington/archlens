/** Shared outcome copy. Product names first. BlueprintSpec is the architecture contract, not a YAML pitch. */

export const PRODUCT_HERO = {
  headline: 'Catch architecture risk before it becomes an outage',
  documentTitle: 'ArchLens - Catch architecture risk before it becomes an outage',
  lede: 'Canvas is the map you work on. The CLI builds it from the repo. TraceLens and ChaosLens run on that map. AdviceLens ranks what to change.',
  trustLine:
    'Open source. No account. Drafts stay in the browser or the folder you open. Nothing is uploaded to ArchLens servers unless you publish a catalog from CI.',
} as const;

export const WHY_IT_MATTERS = [
  {
    title: 'ChaosLens',
    body: 'Monte Carlo on the diagram you have open. Blast radius and SLA bands in the browser. Production stays up.',
  },
  {
    title: 'TraceLens',
    body: 'Churn, coupling and complexity attach to the same entityRef nodes. Not a second dashboard.',
  },
  {
    title: 'AdviceLens',
    body: 'One ranked list from those two signals. Same items in Canvas, the CLI and CI. Not a chatbot.',
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
    body: 'Estate ranking by git metrics, temporal coupling and BlueprintSpec dependency hotspots on every loaded diagram. Nodes that would hurt most if they failed sit at the top.',
  },
  recommendations: {
    body: 'Headless ChaosLens scenarios across every loaded diagram, merged with TraceLens git and connection signals. Click a row for evidence and the next action.',
  },
} as const;
