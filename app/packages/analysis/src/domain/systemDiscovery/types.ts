export type DiscoveredSystem = {
  /** Slug used in entityRefs and output folders. */
  id: string;
  /** Human label for context diagram. */
  displayName: string;
  /**
   * Repo-relative directory that owns this system (`packages`, `plugins`, `microsite`).
   * Empty string = product hub or whole-repo fallback.
   */
  rootPath: string;
  kind: 'workspace' | 'standalone' | 'config' | 'fallback' | 'product';
  /**
   * Product group id - systems sharing this value fan into the product hub.
   * Different products (e.g. blueprint vs backstage) never share edges.
   */
  productId: string;
};

export type SystemDiscoveryFs = {
  exists(path: string): boolean;
  readText(path: string): string | null;
  listDirectoryNames(path: string): string[];
  getAbsolutePath(...parts: string[]): string;
};

export type IacContextSystemInput = {
  entityRef: string;
  displayName: string;
  rootPath: string;
  productId: string;
  isProductHub?: boolean;
  parentEntityRef?: string;
};

export type DiscoverSystemsOptions = {
  systems?: string[];
  fallbackId?: string;
  /** Pin this scan to a named software system (multi-repo products). */
  systemName?: string;
  /** Product hub slug when `systemName` is set (typically the context / `--context` value). */
  productName?: string;
};
