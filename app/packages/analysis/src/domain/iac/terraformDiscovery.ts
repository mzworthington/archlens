import type { AnalysisFileSystemPort } from '../ports.ts';
import { slugFromPath, walkForProjectRoots } from './iacDiscovery.ts';

export type DiscoveredTerraformRoot = {
  /** Absolute directory path of the Terraform root module. */
  rootPath: string;
  /** Slug used as system id under blueprints/. */
  systemId: string;
  /** Absolute paths of `.tf` / `.tf.json` files in this root (non-recursive). */
  filePaths: string[];
};

function isTerraformFile(name: string): boolean {
  return name.endsWith('.tf') || name.endsWith('.tf.json');
}

/**
 * Walk `scanRoot` and find Terraform root modules: directories that contain
 * immediate `.tf` / `.tf.json` files. Nested dirs under an already-discovered
 * root are treated as module directories and skipped as separate systems.
 */
export function discoverTerraformRoots(
  scanRoot: string,
  fileSystem: AnalysisFileSystemPort
): DiscoveredTerraformRoot[] {
  const absScan = fileSystem.getAbsolutePath(scanRoot);
  const roots = walkForProjectRoots(
    scanRoot,
    fileSystem,
    names => names.some(isTerraformFile),
    isTerraformFile
  );

  return roots.map(rootPath => {
    const filePaths = fileSystem
      .listDirectoryNames(rootPath)
      .filter(isTerraformFile)
      .map(name => fileSystem.getAbsolutePath(rootPath, name));
    return {
      rootPath,
      systemId: slugFromPath(rootPath, absScan, 'infrastructure'),
      filePaths,
    };
  });
}
