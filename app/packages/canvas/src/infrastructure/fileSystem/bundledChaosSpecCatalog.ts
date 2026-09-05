import {
  mergeChaosSpecCatalogEntries,
  parseChaosSpecFromYaml,
  toChaosSpecCatalogEntry,
  type ChaosSpecCatalogEntry,
} from '@archlens/core/resilience';
import type { WorkspacePort } from '../../core';

export type BundledChaosSpecCatalogFile = {
  entries: ChaosSpecCatalogEntry[];
};

function bundledChaosSpecUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}bundled-chaos-specs/${relativePath}`.replace(/(?<!:)\/{2,}/g, '/');
}

function isChaosSpecWorkspacePath(name: string): boolean {
  const normalized = name.replace(/\\/g, '/').replace(/^\.\//, '');
  return (
    normalized.startsWith('chaos-specs/') &&
    (normalized.endsWith('.yaml') || normalized.endsWith('.yml'))
  );
}

function workspaceChaosSpecId(name: string): string {
  return name
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^chaos-specs\//, '');
}

/** Load the static ChaosSpec index shipped with Canvas. */
export async function loadBundledChaosSpecCatalog(
  fetchImpl: typeof fetch = fetch
): Promise<ChaosSpecCatalogEntry[]> {
  const response = await fetchImpl(bundledChaosSpecUrl('catalog.json'));
  if (!response.ok) {
    throw new Error(`Failed to load ChaosSpec catalog (${response.status})`);
  }
  const body = (await response.json()) as BundledChaosSpecCatalogFile;
  return Array.isArray(body.entries) ? body.entries : [];
}

/** Fetch a bundled ChaosSpec YAML body by catalog id. */
export async function loadBundledChaosSpecYaml(
  id: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const response = await fetchImpl(bundledChaosSpecUrl(id));
  if (!response.ok) {
    throw new Error(`Failed to load ChaosSpec "${id}" (${response.status})`);
  }
  return response.text();
}

/**
 * Scan the open workspace for `chaos-specs/**` YAML files.
 * Returns catalog entries plus a map of id → yaml for opening without a second read.
 *
 * Catalog-only adapters (bundled samples / remote catalog) report no FS permission and
 * only expose blueprint paths via `readDirectoryFiles` - skip them so the picker is not
 * blocked downloading every BlueprintSpec YAML.
 */
export async function loadWorkspaceChaosSpecs(
  workspacePort: WorkspacePort | null | undefined
): Promise<{
  entries: ChaosSpecCatalogEntry[];
  yamlById: Map<string, string>;
}> {
  const yamlById = new Map<string, string>();
  if (!workspacePort) return { entries: [], yamlById };

  try {
    if (!(await workspacePort.hasPermission())) {
      return { entries: [], yamlById };
    }
  } catch {
    return { entries: [], yamlById };
  }

  let files: Array<{ name: string; content: string }> = [];
  try {
    files = await workspacePort.readDirectoryFiles();
  } catch {
    return { entries: [], yamlById };
  }

  const entries: ChaosSpecCatalogEntry[] = [];
  for (const file of files) {
    if (!isChaosSpecWorkspacePath(file.name)) continue;
    try {
      const document = parseChaosSpecFromYaml(file.content);
      const id = workspaceChaosSpecId(file.name);
      entries.push(toChaosSpecCatalogEntry(id, document));
      yamlById.set(id, file.content);
    } catch {}
  }
  return { entries, yamlById };
}

/** Merge bundled catalog with workspace overrides (workspace wins on id). */
export function mergeChaosSpecCatalogSources(
  bundled: readonly ChaosSpecCatalogEntry[],
  workspace: readonly ChaosSpecCatalogEntry[]
): ChaosSpecCatalogEntry[] {
  return mergeChaosSpecCatalogEntries(bundled, workspace);
}
