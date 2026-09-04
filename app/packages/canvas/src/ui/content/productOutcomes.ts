/** Shared outcome copy. Product names first. BlueprintSpec is the architecture contract, not a YAML pitch. */

export const PRODUCT_HERO = {
  headline: 'Catch architecture risk before it becomes an outage',
  documentTitle: 'ArchLens - Catch architecture risk before it becomes an outage',
  lede: 'Canvas is the workspace over BlueprintSpec. The CLI writes that contract from the repo. Overlay git hotspots, simulate a dependency dying, then leave with a ranked list instead of another parking lot of actions.',
  trustLine:
    'Open source. No account. Drafts stay in the browser or the folder you open. Nothing is uploaded to ArchLens servers unless you publish a catalog from CI.',
} as const;

export const WHY_IT_MATTERS = [
  {
    title: 'Game day on the diagram',
    body: 'ChaosLens faults a service on the BlueprintSpec you already have open. Blast radius and SLA bands in the browser. Production stays untouched.',
  },
  {
    title: 'Hotspots on the same nodes',
    body: 'TraceLens attaches churn, complexity and coupling to the nodes you maintain. Fragile files sit on the map, not in a separate dashboard.',
  },
  {
    title: 'A ranked list of what to change',
    body: 'AdviceLens merges those signals and orders the work. Scores come from simulation and forensics, not a chatbot paragraph.',
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
