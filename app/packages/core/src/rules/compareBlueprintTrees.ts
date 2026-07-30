import type { SystemSchema } from '../models/schema';
import { compareSystemSchemas } from './compareSystemSchemas';
import type { BlueprintTreeDiff } from './schemaDiff';
import { schemaDiffHasChanges } from './schemaDiff';

export type LoadedBlueprintFile = {
  relativePath: string;
  schema: SystemSchema;
};

/**
 * Structural diff of two blueprint trees matched by relative file path.
 */
export function compareBlueprintTrees(
  baseline: LoadedBlueprintFile[],
  current: LoadedBlueprintFile[]
): BlueprintTreeDiff {
  const baselineByPath = new Map(baseline.map(file => [file.relativePath, file]));
  const currentByPath = new Map(current.map(file => [file.relativePath, file]));
  const allPaths = [...new Set([...baselineByPath.keys(), ...currentByPath.keys()])].sort();

  const files = allPaths.map(relativePath => {
    const baselineFile = baselineByPath.get(relativePath);
    const currentFile = currentByPath.get(relativePath);

    if (baselineFile && !currentFile) {
      const diff = compareSystemSchemas(baselineFile.schema, emptySchema(), relativePath, '');
      return { relativePath, status: 'removed' as const, diff };
    }

    if (!baselineFile && currentFile) {
      const diff = compareSystemSchemas(emptySchema(), currentFile.schema, '', relativePath);
      return { relativePath, status: 'added' as const, diff };
    }

    const diff = compareSystemSchemas(
      baselineFile!.schema,
      currentFile!.schema,
      relativePath,
      relativePath
    );

    if (!schemaDiffHasChanges(diff)) {
      return { relativePath, status: 'unchanged' as const };
    }

    return { relativePath, status: 'modified' as const, diff };
  });

  return { files };
}

function emptySchema(): SystemSchema {
  return {
    name: '',
    version: '',
    level: 'component',
    nodes: [],
    dependencies: [],
  };
}
