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

/** Read Pulumi project runtime from `Pulumi.yaml` content (inline or nested `runtime.name`). */
export function readPulumiProjectRuntime(content: string): PulumiRuntime {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (!trimmed.startsWith('runtime:')) continue;

    const afterKey = trimmed.slice('runtime:'.length);
    const inlineValue = afterKey.trim().split(/\s+/).find(Boolean);
    if (inlineValue && inlineValue !== 'name:') {
      return inlineValue;
    }

    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (next.trim() === '') continue;
      if (!/^[ \t]/.test(next)) break;
      const nested = next.trimStart();
      if (nested.startsWith('name:')) {
        const name = nested.slice('name:'.length).trim().split(/\s+/).find(Boolean);
        if (name) return name;
      }
    }
    break;
  }

  return 'yaml';
}

export function isPulumiProjectFileName(name: string): boolean {
  return PULUMI_PROJECT_FILE.test(name);
}

export function isPulumiStackConfigFileName(name: string): boolean {
  return PULUMI_STACK_CONFIG.test(name);
}

/**
 * Whether a filename is a Pulumi program source for the given runtime.
 * Pass `content` for `Pulumi.yaml` when runtime is `yaml` to require a `resources` block.
 */
export function isPulumiSourceFileForRuntime(
  name: string,
  runtime: PulumiRuntime,
  content?: string
): boolean {
  if (isPulumiStackConfigFileName(name)) return false;
  if (isPulumiProjectFileName(name)) {
    if (runtime !== 'yaml') return false;
    return content === undefined || yamlHasResources(content);
  }

  switch (runtime) {
    case 'yaml':
      return /\.ya?ml$/i.test(name);
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
 * Keep program sources for imperative runtimes; only keep YAML files that declare resources.
 * `Pulumi.yaml` project metadata alone is used for discovery, not resource extraction.
 */
export function filterPulumiStackFiles(
  files: PulumiSourceFile[],
  runtime: PulumiRuntime
): PulumiSourceFile[] {
  return files.filter(file =>
    isPulumiSourceFileForRuntime(basename(file.path), runtime, file.content)
  );
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
