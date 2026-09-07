export type { DiscoveredSystem, SystemDiscoveryFs } from './types';

export { parseNpmWorkspaces, parsePnpmWorkspacePackages, workspaceRootsFromGlobs } from './helpers';

export { withProductHub } from './productHub';

export { discoverSystems } from './discoverSystems';

export { partitionFilesBySystem, resolveProductIdForPath } from './partitionFiles';

export { planIacContextSystems, productHubInputsForIac } from './iacContext';

export {
  hubRefForProductNodes,
  normalizeContextGrouping,
  pruneEmptyProductHubs,
} from './contextGrouping';
