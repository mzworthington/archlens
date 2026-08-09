/**
 * Public API / facade for system discovery.
 * Implementation lives under `./systemDiscovery/`.
 */

export type {
  DiscoveredSystem,
  DiscoverSystemsOptions,
  IacContextSystemInput,
  SystemDiscoveryFs,
} from './systemDiscovery/types.ts';

export {
  parseNpmWorkspaces,
  parsePnpmWorkspacePackages,
  workspaceRootsFromGlobs,
} from './systemDiscovery/helpers.ts';

export { withProductHub } from './systemDiscovery/productHub.ts';

export { discoverSystems } from './systemDiscovery/discoverSystems.ts';

export {
  partitionFilesBySystem,
  resolveProductIdForPath,
} from './systemDiscovery/partitionFiles.ts';

export { planIacContextSystems, productHubInputsForIac } from './systemDiscovery/iacContext.ts';

export {
  entityRefLeaf,
  hubRefForProductNodes,
  normalizeContextGrouping,
  pruneEmptyProductHubs,
} from './systemDiscovery/contextGrouping.ts';
