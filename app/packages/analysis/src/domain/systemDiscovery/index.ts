export type { DiscoveredSystem, SystemDiscoveryFs } from './types.ts';

export {
  parseNpmWorkspaces,
  parsePnpmWorkspacePackages,
  workspaceRootsFromGlobs,
} from './helpers.ts';

export { withProductHub } from './productHub.ts';

export { discoverSystems } from './discoverSystems.ts';

export { partitionFilesBySystem, resolveProductIdForPath } from './partitionFiles.ts';

export { planIacContextSystems, productHubInputsForIac } from './iacContext.ts';

export {
  hubRefForProductNodes,
  normalizeContextGrouping,
  pruneEmptyProductHubs,
} from './contextGrouping.ts';
