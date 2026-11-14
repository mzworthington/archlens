import path from 'node:path';
import { parseSchemaFromYaml, type SystemSchema } from '@archlens/core';
import type { AnalysisFileSystemPort } from '@archlens/analysis/ports';
import { listBlueprintSchemaPaths } from '@archlens/analysis/writers';

export type LoadedBlueprintFile = {
  path: string;
  relativePath: string;
  schema: SystemSchema;
};

/**
 * Load all blueprint YAML files under rootDir, reporting parse failures.
 */
export async function loadBlueprintTree(
  rootDir: string,
  fileSystem: AnalysisFileSystemPort
): Promise<{
  files: LoadedBlueprintFile[];
  parseErrors: Array<{ path: string; message: string }>;
}> {
  const absoluteRoot = path.resolve(rootDir);
  const paths = listBlueprintSchemaPaths(absoluteRoot, fileSystem);
  const files: LoadedBlueprintFile[] = [];
  const parseErrors: Array<{ path: string; message: string }> = [];

  for (const schemaPath of paths) {
    try {
      const raw = await fileSystem.readSchema(schemaPath);
      const schema = parseSchemaFromYaml(raw);
      if (!schema.level || !Array.isArray(schema.nodes)) {
        parseErrors.push({
          path: schemaPath,
          message: 'File is not a BlueprintSpec diagram (missing level or nodes).',
        });
        continue;
      }
      files.push({
        path: schemaPath,
        relativePath: path.relative(absoluteRoot, schemaPath),
        schema,
      });
    } catch (err) {
      parseErrors.push({
        path: schemaPath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { files, parseErrors };
}
