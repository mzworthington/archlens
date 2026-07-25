import type { InfraImportOptions } from './infraSchemaMap';
import {
  parsePulumiBatchToSchema,
  type PulumiParseResult,
  type PulumiSourceFile,
} from './pulumiImport';

export type PulumiRuntime = 'yaml' | 'nodejs' | 'python' | 'go' | 'dotnet' | (string & {});

const PULUMI_STACK_CONFIG = /^pulumi\.[^.]+\.ya?ml$/i;
const PULUMI_PROJECT_FILE = /^pulumi\.ya?ml$/i;

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.split('/').pop() || path;
}

function yamlHasResources(content: string): boolean {
  return /^resources\s*:/m.test(content) || /\nresources\s*:/m.test(content);
}

/**
 * Keep program sources for imperative runtimes; only keep YAML files that declare resources.
 * `Pulumi.yaml` project metadata alone is used for discovery, not resource extraction.
 */
export function filterPulumiStackFiles(
  files: PulumiSourceFile[],
  runtime: PulumiRuntime
): PulumiSourceFile[] {
  switch (runtime) {
    case 'python':
      return files.filter(file => /\.py$/i.test(file.path));
    case 'nodejs':
      return files.filter(file => /\.tsx?$/i.test(file.path) && !/\.d\.ts$/i.test(file.path));
    case 'go':
      return files.filter(file => file.path.endsWith('.go'));
    case 'dotnet':
      return files.filter(file => file.path.endsWith('.cs'));
    case 'yaml':
      return files.filter(file => {
        const name = basename(file.path);
        if (PULUMI_STACK_CONFIG.test(name)) return false;
        if (!/\.ya?ml$/i.test(file.path)) return false;
        return PULUMI_PROJECT_FILE.test(name) ? yamlHasResources(file.content) : true;
      });
    default:
      return files.filter(file => {
        const name = basename(file.path);
        if (PULUMI_STACK_CONFIG.test(name)) return false;
        if (PULUMI_PROJECT_FILE.test(name)) return yamlHasResources(file.content);
        return true;
      });
  }
}

/** Parse a discovered Pulumi stack using runtime-appropriate sources only. */
export function parsePulumiStackToSchema(
  files: PulumiSourceFile[],
  runtime: PulumiRuntime,
  options: InfraImportOptions
): PulumiParseResult {
  const stackFiles = filterPulumiStackFiles(files, runtime);
  if (stackFiles.length === 0) {
    return parsePulumiBatchToSchema([], options);
  }
  return parsePulumiBatchToSchema(stackFiles, options);
}
