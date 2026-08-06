import {
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

/**
 * Walk `scanRoot` and find Pulumi projects: directories that contain `Pulumi.yaml`.
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

  return roots.map(rootPath => {
    const pulumiYaml = fileSystem.getAbsolutePath(rootPath, 'Pulumi.yaml');
    const pulumiYml = fileSystem.getAbsolutePath(rootPath, 'Pulumi.yml');
    const projectFile = fileSystem.exists(pulumiYaml)
      ? pulumiYaml
      : fileSystem.exists(pulumiYml)
        ? pulumiYml
        : pulumiYaml;
    const projectContent = fileSystem.readText(projectFile) ?? '';
    const runtime = readPulumiProjectRuntime(projectContent);
    const filePaths = fileSystem
      .listDirectoryNames(rootPath)
      .filter(name => {
        const content = isPulumiProjectFileName(name)
          ? (fileSystem.readText(fileSystem.getAbsolutePath(rootPath, name)) ?? undefined)
          : undefined;
        return isPulumiSourceFileForRuntime(name, runtime, content);
      })
      .map(name => fileSystem.getAbsolutePath(rootPath, name));

    return {
      rootPath,
      // Prefer the directory name when the Pulumi project *is* the scan root
      // (explicit infra repo / package), not a generic "pulumi" slug.
      systemId: slugFromPath(rootPath, absScan, directorySlug(absScan, 'pulumi')),
      runtime,
      filePaths,
    };
  });
}
