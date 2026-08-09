import {
  isPulumiProjectContent,
  isPulumiProjectFileName,
  isPulumiSourceFileForRuntime,
  readPulumiProjectRuntime,
} from '@archlens/core/import-iac';
import type { AnalysisFileSystemPort } from './ports.ts';
import { directorySlug, slugFromPath, walkForProjectRoots } from './iacDiscovery.ts';

export type DiscoveredPulumiRoot = {
  /** Absolute directory path of the Pulumi project. */
  rootPath: string;
  /** Slug used as system id under blueprints/. */
  systemId: string;
  /** Pulumi runtime from Pulumi.yaml (e.g. yaml, nodejs, python). */
  runtime: string;
  /** Absolute paths of source files in this project (non-recursive). */
  filePaths: string[];
};

function resolvePulumiProjectFile(
  rootPath: string,
  fileSystem: AnalysisFileSystemPort
): { fileName: string; absolutePath: string; content: string } | undefined {
  const fileName = fileSystem.listDirectoryNames(rootPath).find(isPulumiProjectFileName);
  if (!fileName) return undefined;
  const absolutePath = fileSystem.getAbsolutePath(rootPath, fileName);
  const content = fileSystem.readText(absolutePath) ?? '';
  if (!isPulumiProjectContent(content)) return undefined;
  return { fileName, absolutePath, content };
}

/**
 * Walk `scanRoot` and find Pulumi projects: directories that contain a real
 * `Pulumi.yaml` / `pulumi.yaml` with `name` + `runtime` metadata.
 * Nested dirs under an already-discovered root are skipped as separate systems.
 */
export function discoverPulumiRoots(
  scanRoot: string,
  fileSystem: AnalysisFileSystemPort
): DiscoveredPulumiRoot[] {
  const absScan = fileSystem.getAbsolutePath(scanRoot);
  const roots = walkForProjectRoots(
    scanRoot,
    fileSystem,
    names => names.some(isPulumiProjectFileName),
    isPulumiProjectFileName
  );

  const discovered: DiscoveredPulumiRoot[] = [];
  for (const rootPath of roots) {
    const project = resolvePulumiProjectFile(rootPath, fileSystem);
    if (!project) continue;

    const runtime = readPulumiProjectRuntime(project.content);
    const filePaths = fileSystem
      .listDirectoryNames(rootPath)
      .filter(name => {
        const content = isPulumiProjectFileName(name)
          ? (fileSystem.readText(fileSystem.getAbsolutePath(rootPath, name)) ?? undefined)
          : undefined;
        return isPulumiSourceFileForRuntime(name, runtime, content);
      })
      .map(name => fileSystem.getAbsolutePath(rootPath, name));

    discovered.push({
      rootPath,
      // Prefer the directory name when the Pulumi project *is* the scan root
      // (explicit infra repo / package), not a generic "pulumi" slug.
      systemId: slugFromPath(rootPath, absScan, directorySlug(absScan, 'pulumi')),
      runtime,
      filePaths,
    });
  }
  return discovered;
}
