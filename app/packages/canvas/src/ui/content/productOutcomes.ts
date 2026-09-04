/** Shared outcome copy. Write for architects, CTOs and engineering directors. */

export const PRODUCT_HERO = {
  headline: 'A C4 map you can fault in a design review',
  documentTitle: 'ArchLens - C4 maps you can fault in review',
  lede: 'The CLI writes BlueprintSpec YAML from the repo. Canvas is the workspace over that contract. Overlay git hotspots, simulate a dependency dying, then leave review with a ranked list instead of another parking lot of actions.',
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
    body: 'TraceLens attaches churn, complexity and coupling to the C4 nodes you maintain. Fragile files sit on the map, not in a separate dashboard.',
  },
  {
    title: 'A ranked list for the RFC',
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
