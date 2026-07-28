import { slugify } from '@archlens/core';
import type { SystemNode } from '@archlens/core';

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
   * Product group id — systems sharing this value fan into the product hub.
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

/** Root dirs never promoted to standalone systems. */
const STANDALONE_DENYLIST = new Set([
  'node_modules',
  '.git',
  '.github',
  '.husky',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'out',
  'coverage',
  'docs',
  'documentation',
  'scripts',
  'e2e',
  'cypress',
  'playwright',
  'blueprints',
  'tmp',
  'temp',
]);

function titleCase(name: string): string {
  if (!name) return 'App';
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Extract unique first path segments from workspace globs.
 * `packages/*` → `packages`, `apps/web/*` → `apps` (first segment only for multi-system split).
 */
export function workspaceRootsFromGlobs(globs: string[]): string[] {
  const roots = new Set<string>();
  for (const raw of globs) {
    const cleaned = raw.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
    const first = cleaned.split('/').filter(Boolean)[0];
    if (!first || first.includes('*')) continue;
    roots.add(first);
  }
  return [...roots];
}

export function parseNpmWorkspaces(packageJsonText: string): string[] {
  try {
    const pkg = JSON.parse(packageJsonText) as {
      workspaces?: string[] | { packages?: string[] };
    };
    if (Array.isArray(pkg.workspaces)) return pkg.workspaces;
    if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
      return pkg.workspaces.packages;
    }
  } catch {
    // ignore
  }
  return [];
}

export function parsePnpmWorkspacePackages(yamlText: string): string[] {
  const packages: string[] = [];
  let inPackages = false;
  for (const line of yamlText.split(/\r?\n/)) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      if (/^\S/.test(line) && !line.trim().startsWith('#')) {
        inPackages = false;
        continue;
      }
      const match = line.match(/^\s*-\s*['"]?([^'"#]+)['"]?\s*$/);
      if (match) packages.push(match[1].trim());
    }
  }
  return packages;
}

function readWorkspaceGlobs(cwd: string, fs: SystemDiscoveryFs): string[] {
  const pkgPath = fs.getAbsolutePath(cwd, 'package.json');
  if (fs.exists(pkgPath)) {
    const text = fs.readText(pkgPath);
    if (text) {
      const fromNpm = parseNpmWorkspaces(text);
      if (fromNpm.length > 0) return fromNpm;
    }
  }

  const pnpmPath = fs.getAbsolutePath(cwd, 'pnpm-workspace.yaml');
  if (fs.exists(pnpmPath)) {
    const text = fs.readText(pnpmPath);
    if (text) return parsePnpmWorkspacePackages(text);
  }

  return [];
}

function readPackageName(cwd: string, fs: SystemDiscoveryFs): string | undefined {
  const pkgPath = fs.getAbsolutePath(cwd, 'package.json');
  if (!fs.exists(pkgPath)) return undefined;
  const text = fs.readText(pkgPath);
  if (!text) return undefined;
  try {
    const name = JSON.parse(text).name as string | undefined;
    if (!name || name === 'root') return undefined;
    return name.includes('/') ? name.split('/').pop() : name;
  } catch {
    return undefined;
  }
}

/**
 * Attach a product hub when multiple subsystems are found so the context diagram
 * can fan spokes into one product node (e.g. Backstage ← packages/plugins/microsite).
 */
export function withProductHub(
  systems: DiscoveredSystem[],
  productName: string
): DiscoveredSystem[] {
  if (systems.length === 0) return systems;

  const productId = slugify(productName);
  if (systems.length === 1 && (systems[0].kind === 'fallback' || systems[0].id === productId)) {
    return [
      {
        ...systems[0],
        id: productId,
        displayName: titleCase(productName),
        productId,
        kind: systems[0].kind === 'fallback' ? 'fallback' : 'product',
      },
    ];
  }

  const children = systems.filter(s => s.id !== productId);
  const hub: DiscoveredSystem = {
    id: productId,
    displayName: titleCase(productName),
    rootPath: '',
    kind: 'product',
    productId,
  };

  return [
    hub,
    ...children.map(s => ({
      ...s,
      productId,
    })),
  ];
}

/**
 * Discover navigable software systems for a complex monorepo.
 *
 * 1. Config override (`systems`) when provided — still wrapped with a product hub
 * 2. Workspace roots + standalone packages + product hub
 * 3. Fallback single product system when nothing is detected
 */
export function discoverSystems(
  cwd: string,
  fs: SystemDiscoveryFs,
  options: {
    systems?: string[];
    fallbackId?: string;
  } = {}
): DiscoveredSystem[] {
  const productName =
    options.fallbackId ||
    readPackageName(cwd, fs) ||
    cwd.split(/[\\/]/).filter(Boolean).pop() ||
    'app';

  if (options.systems && options.systems.length > 0) {
    const configured = options.systems.map(name => {
      const id = slugify(name);
      return {
        id,
        displayName: titleCase(name),
        rootPath: name.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, ''),
        kind: 'config' as const,
        productId: id,
      };
    });
    return withProductHub(configured, productName);
  }

  const workspaceGlobs = readWorkspaceGlobs(cwd, fs);
  const roots = workspaceRootsFromGlobs(workspaceGlobs);
  const systems: DiscoveredSystem[] = roots.map(root => ({
    id: slugify(root),
    displayName: titleCase(root),
    rootPath: root,
    kind: 'workspace' as const,
    productId: slugify(root),
  }));

  const rootNames = new Set(roots.map(r => r.toLowerCase()));
  for (const entry of fs.listDirectoryNames(cwd)) {
    if (STANDALONE_DENYLIST.has(entry.toLowerCase())) continue;
    if (rootNames.has(entry.toLowerCase())) continue;
    if (entry.startsWith('.')) continue;

    const absDir = fs.getAbsolutePath(cwd, entry);
    const pkgJson = fs.getAbsolutePath(absDir, 'package.json');
    if (!fs.exists(pkgJson)) continue;

    systems.push({
      id: slugify(entry),
      displayName: titleCase(entry),
      rootPath: entry,
      kind: 'standalone',
      productId: slugify(entry),
    });
  }

  if (systems.length === 0) {
    const fallbackId = slugify(productName);
    return [
      {
        id: fallbackId,
        displayName: titleCase(productName),
        rootPath: '',
        kind: 'fallback',
        productId: fallbackId,
      },
    ];
  }

  return withProductHub(systems, productName);
}

/** Assign each source file to the best matching system (longest rootPath prefix wins). */
export function partitionFilesBySystem<T extends { relativePath: string }>(
  files: T[],
  systems: DiscoveredSystem[]
): Map<string, T[]> {
  const sorted = [...systems].sort((a, b) => b.rootPath.length - a.rootPath.length);
  const buckets = new Map<string, T[]>();
  for (const system of systems) {
    buckets.set(system.id, []);
  }

  // Prefer product hub as unmatched sink; otherwise any empty-root system.
  const fallback =
    systems.find(s => s.kind === 'product') || systems.find(s => s.rootPath === '') || systems[0];

  for (const file of files) {
    const rel = file.relativePath.replace(/\\/g, '/');
    let matched = fallback;
    for (const system of sorted) {
      if (!system.rootPath) continue;
      if (rel === system.rootPath || rel.startsWith(`${system.rootPath}/`)) {
        matched = system;
        break;
      }
    }
    buckets.get(matched.id)!.push(file);
  }

  return buckets;
}

/** Resolve which product group owns a repo-relative path (same rules as code file partitioning). */
export function resolveProductIdForPath(relativePath: string, systems: DiscoveredSystem[]): string {
  if (systems.length === 0) return 'infrastructure';

  const normalized = relativePath.replace(/\\/g, '/');
  const buckets = partitionFilesBySystem([{ relativePath: normalized }], systems);
  const matched = systems.find(s => (buckets.get(s.id)?.length ?? 0) > 0);
  return matched?.productId ?? systems[0]!.productId;
}

export type IacContextSystemInput = {
  entityRef: string;
  displayName: string;
  rootPath: string;
  productId: string;
  isProductHub?: boolean;
  parentEntityRef?: string;
};

/**
 * Plan IaC context nodes with correct parents in one pass.
 * When a product hub exists, modules nest under the hub (no intermediate folder group).
 * Otherwise sibling modules under the same folder get a folder group frame.
 */
export function planIacContextSystems(
  subsystems: IacContextSystemInput[],
  hasProductHub: (productId: string) => boolean
): IacContextSystemInput[] {
  const byParent = new Map<string, IacContextSystemInput[]>();

  for (const system of subsystems) {
    const rel = system.rootPath.replace(/\\/g, '/').replace(/\/$/, '');
    const slash = rel.lastIndexOf('/');
    if (slash === -1) continue;
    const parentPath = rel.slice(0, slash);
    const siblings = byParent.get(parentPath) ?? [];
    siblings.push(system);
    byParent.set(parentPath, siblings);
  }

  const folderGroups: IacContextSystemInput[] = [];
  const parentByChildEntity = new Map<string, string>();

  for (const [parentPath, children] of byParent) {
    if (children.length < 2) continue;

    const productId = children[0]!.productId;
    if (hasProductHub(productId)) {
      for (const child of children) {
        parentByChildEntity.set(child.entityRef, productId);
      }
      continue;
    }

    const folderName = parentPath.split('/').filter(Boolean).pop() || parentPath;
    const groupEntityRef = slugify(folderName);

    folderGroups.push({
      entityRef: groupEntityRef,
      displayName: titleCase(folderName),
      rootPath: parentPath,
      productId,
    });

    for (const child of children) {
      parentByChildEntity.set(child.entityRef, groupEntityRef);
    }
  }

  return [
    ...folderGroups,
    ...subsystems.map(system => ({
      ...system,
      parentEntityRef: parentByChildEntity.get(system.entityRef) ?? system.parentEntityRef,
    })),
  ];
}

/** Ensure product hub frames exist when IaC roots nest under a multi-system product. */
export function productHubInputsForIac(
  systems: DiscoveredSystem[],
  subsystems: IacContextSystemInput[]
): IacContextSystemInput[] {
  const productIds = new Set(subsystems.map(s => s.productId));
  return systems
    .filter(s => s.kind === 'product' && productIds.has(s.productId))
    .map(s => ({
      entityRef: s.id,
      displayName: s.displayName,
      rootPath: '',
      productId: s.productId,
      isProductHub: true,
    }));
}

/** Leaf segment of an entity ref (`blueprint/aws` → `aws`). */
export function entityRefLeaf(entityRef: string): string {
  const slash = entityRef.lastIndexOf('/');
  return slash === -1 ? entityRef : entityRef.slice(slash + 1);
}

/** Top-level product hub for a product id (entity ref leaf matches productId). */
export function hubRefForProductNodes(nodes: SystemNode[], productId: string): string | undefined {
  return nodes.find(
    n =>
      n.type !== 'person' &&
      !n.parentEntityRef &&
      String(n.properties?.productId || '') === productId &&
      entityRefLeaf(n.entityRef) === productId
  )?.entityRef;
}

function isIacFolderGroupNode(node: SystemNode, hubRef: string | undefined): boolean {
  const productId = String(node.properties?.productId || '');
  if (!productId || !hubRef || node.entityRef === hubRef || node.type !== 'group') {
    return false;
  }
  const rootPath = String(node.properties?.rootPath || '');
  return !!rootPath && entityRefLeaf(node.entityRef) !== productId;
}

/**
 * Remove stale IaC folder groups under a product hub and promote hubs with children to `group`.
 * Handles incremental merges when prior scans left orphan folder frames in context.yaml.
 */
export function normalizeContextGrouping(nodes: SystemNode[]): SystemNode[] {
  const hubByProduct = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === 'person' || node.parentEntityRef) continue;
    const productId = String(node.properties?.productId || '');
    if (!productId) continue;
    if (entityRefLeaf(node.entityRef) === productId) {
      hubByProduct.set(productId, node.entityRef);
    }
  }

  const folderGroupRefs = new Set<string>();
  for (const node of nodes) {
    const productId = String(node.properties?.productId || '');
    const hubRef = hubByProduct.get(productId);
    if (!isIacFolderGroupNode(node, hubRef)) continue;

    const hasChildren = nodes.some(n => n.parentEntityRef === node.entityRef);
    const nestedUnderHub = node.parentEntityRef === hubRef;
    const topLevelOrphan = !node.parentEntityRef;

    if (hasChildren && (topLevelOrphan || nestedUnderHub)) {
      folderGroupRefs.add(node.entityRef);
    } else if (nestedUnderHub && !hasChildren) {
      folderGroupRefs.add(node.entityRef);
    }
  }

  let result = nodes
    .filter(n => !folderGroupRefs.has(n.entityRef))
    .map(node => {
      if (node.parentEntityRef && folderGroupRefs.has(node.parentEntityRef)) {
        const productId = String(node.properties?.productId || '');
        const hubRef = hubByProduct.get(productId);
        if (hubRef) return { ...node, parentEntityRef: hubRef };
      }
      return node;
    });

  const childCounts = new Map<string, number>();
  for (const node of result) {
    if (!node.parentEntityRef) continue;
    childCounts.set(node.parentEntityRef, (childCounts.get(node.parentEntityRef) ?? 0) + 1);
  }

  return result.map(node => {
    const productId = String(node.properties?.productId || '');
    const hubRef = hubByProduct.get(productId);
    if (node.entityRef === hubRef && (childCounts.get(node.entityRef) ?? 0) > 0) {
      return { ...node, type: 'group' };
    }
    return node;
  });
}

/** Drop product hub frames that no longer have nested systems. */
export function pruneEmptyProductHubs(nodes: SystemNode[], productIds: string[]): SystemNode[] {
  let result = [...nodes];
  for (const productId of productIds) {
    const hub = result.find(
      n =>
        n.type === 'group' &&
        String(n.properties?.productId || '') === productId &&
        !n.parentEntityRef
    );
    if (!hub) continue;
    const hasChildren = result.some(n => n.parentEntityRef === hub.entityRef);
    if (!hasChildren) {
      result = result.filter(n => n.entityRef !== hub.entityRef);
    }
  }
  return result;
}
