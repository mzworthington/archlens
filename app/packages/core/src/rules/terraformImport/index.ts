import { infraIrToSchema } from '../infra/infraSchemaMap';
import { documentToInfraIR, parseSourcesToIr } from './document';
import { detectFormat, parseDocument } from './format';
import type { TerraformImportOptions, TerraformParseResult, TerraformSourceFile } from './types';

export type { TerraformImportOptions, TerraformParseResult, TerraformSourceFile } from './types';
export { extractTerraformFromMarkdown } from './markdown';

export function parseTerraformToSchema(
  source: string,
  options: TerraformImportOptions
): TerraformParseResult {
  const format = detectFormat(source, options.sourceFormat ?? 'auto');
  const doc = parseDocument(source, format);
  const ir = documentToInfraIR([{ label: '<input>', doc }]);
  const { schema, warnings } = infraIrToSchema(ir, options);
  return { schema, format, warnings };
}

export function parseTerraformBatchToSchema(
  files: TerraformSourceFile[],
  options: TerraformImportOptions
): TerraformParseResult {
  if (files.length === 0) {
    return {
      schema: {
        name: 'infrastructure',
        version: '0.1.0',
        level: options.targetLevel,
        nodes: [],
        dependencies: [],
        ...(options.parentEntityRef ? { entityRef: options.parentEntityRef } : {}),
      },
      format: 'hcl',
      warnings: [],
    };
  }

  const { ir, format } = parseSourcesToIr(files);
  const { schema, warnings } = infraIrToSchema(ir, options);
  return { schema, format, warnings };
}
