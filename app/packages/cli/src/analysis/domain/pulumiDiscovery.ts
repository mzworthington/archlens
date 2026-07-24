import type { AnalysisFileSystemPort } from './ports.ts';
import { slugFromPath, walkForProjectRoots } from './iacDiscovery.ts';

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

function isStackConfigFile(name: string): boolean {
  return /^Pulumi\.[^.]+\.ya?ml$/i.test(name);
}

function isPulumiProjectFile(name: string): boolean {
  return name === 'Pulumi.yaml' || name === 'Pulumi.yml';
}

function readProjectRuntime(pulumiYamlPath: string, fileSystem: AnalysisFileSystemPort): string {
  const content = fileSystem.readText(pulumiYamlPath);
  if (content === null) return 'yaml';
  const match = /^\s*runtime:\s*(\S+)/m.exec(content);
  return match?.[1] ?? 'yaml';
}

function isSourceFile(name: string, runtime: string): boolean {
  if (isStackConfigFile(name)) return false;
  if (isPulumiProjectFile(name)) return true;

  switch (runtime) {
    case 'yaml':
      return /\.ya?ml$/i.test(name) && !isStackConfigFile(name);
    case 'nodejs':
      return /\.tsx?$/i.test(name) && !/\.d\.ts$/i.test(name);
    case 'python':
      return name.endsWith('.py');
    case 'go':
      return name.endsWith('.go');
    case 'dotnet':
      return name.endsWith('.cs');
    default:
      return /\.ya?ml$/i.test(name) || /\.tsx?$/i.test(name);
  }
}

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
    names => names.some(isPulumiProjectFile),
    isPulumiProjectFile
  );

  return roots.map(rootPath => {
    const pulumiYaml = fileSystem.getAbsolutePath(rootPath, 'Pulumi.yaml');
    const pulumiYml = fileSystem.getAbsolutePath(rootPath, 'Pulumi.yml');
    const projectFile = fileSystem.exists(pulumiYaml)
      ? pulumiYaml
      : fileSystem.exists(pulumiYml)
        ? pulumiYml
        : pulumiYaml;
    const runtime = readProjectRuntime(projectFile, fileSystem);
    const filePaths = fileSystem
      .listDirectoryNames(rootPath)
      .filter(name => isSourceFile(name, runtime))
      .map(name => fileSystem.getAbsolutePath(rootPath, name));

    return {
      rootPath,
      systemId: slugFromPath(rootPath, absScan, 'pulumi'),
      runtime,
      filePaths,
    };
  });
}
